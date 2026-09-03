"""ATS 채용 보드 확장 수집 — Greenhouse · Lever · Ashby.

왜 더 모으나
  민간 공고 1,200건 중 시니어가 69%다. 요구 스킬이 전부 5년차 기준으로 잡혀
  Route.gapSkills 가 실제보다 무겁게 나온다. 신입 공고를 늘려야 한다.
  공공기관 공고는 아무리 모아도 소용없다 — 80%에 기술 스킬 서술이 없다.
  스킬이 적힌 신입 공고는 민간에만 있다(신입 판정 419건 중 97%에 스킬 있음).

세 ATS 모두 회사가 자사 채용 페이지에 노출할 목적으로 공개한 엔드포인트다.
스크래핑이 아니다.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import polite_get, save, load_seen, stats  # noqa: E402
from classify import job_family  # noqa: E402

GH = "https://boards-api.greenhouse.io/v1/boards/{}/jobs"
LV = "https://api.lever.co/v0/postings/{}"
AS = "https://api.ashbyhq.com/posting-api/job-board/{}"

# 1·2차 탐색에서 확인된 보드 + 3차 후보.
# 국내 기업과 국내 채용 비중이 높은 곳을 우선한다.
KNOWN = [
    ("greenhouse", "coupang"), ("greenhouse", "krafton"), ("greenhouse", "daangn"),
    ("greenhouse", "moloco"), ("greenhouse", "sendbird"), ("greenhouse", "klaviyo"),
    ("greenhouse", "flex"), ("lever", "zeta"), ("ashby", "megazone"),
]

CANDIDATES = """
tossbank tosspayments viva toss8 kakaomobility kakaohealthcare kakaoinvestment
linegames lineplus linenext webtoonentertainment naverwebtoon naverz
gowid banksalad finda peoplefund kakaostyle croquis zigzag brandi
ridi watcha wadiz publy folin longblack
mathpresso qanda riiid tutoring classting
sendtime spoqa deepnatural scatterlab wrtn liner
lunit vuno jlkinspection airsmedical noul
bucketplace ohouse ably aprilskin musinsa
socar tada kakaot roadvision superbin
channelcorp channeltalk sendbirdkorea beusable
elice codeit goorm programmers grepp softeer
bespinglobal megazonecloud cloudmt smileshark
dunamu upbit bithumb korbit streami
buzzvil adison igaworks airbridge ab180
imweb cafe24 portone bootpay settle
lemonbase greetinghq flexteam remembercompany
hyperconnect azarlive matchgroup
zeta megazone flex viva-republica
""".split()


def fetch(kind, token):
    if kind == "greenhouse":
        r = polite_get(GH.format(token), params={"content": "true"}, timeout=90)
        if r.status_code != 200:
            return None
        return [("greenhouse", token, j) for j in r.json().get("jobs", [])]
    if kind == "lever":
        r = polite_get(LV.format(token), params={"mode": "json"}, timeout=60)
        if r.status_code != 200:
            return None
        d = r.json()
        return [("lever", token, j) for j in d] if isinstance(d, list) else None
    r = polite_get(AS.format(token), timeout=60)
    if r.status_code != 200:
        return None
    return [("ashby", token, j) for j in r.json().get("jobs", [])]


def norm(kind, token, j):
    """(제목, 본문, 출처URL, 등록일) — ATS 마다 필드 이름이 다르다."""
    if kind == "greenhouse":
        return (j.get("title", ""), j.get("content", ""), j.get("absolute_url", ""),
                (j.get("first_published") or "")[:10] or None)
    if kind == "lever":
        return (j.get("text", ""),
                (j.get("descriptionPlain") or j.get("description") or "")
                + " " + " ".join(l.get("text", "") + " " + str(l.get("content", ""))
                                 for l in (j.get("lists") or [])),
                j.get("hostedUrl", ""), None)
    return (j.get("title", ""),
            j.get("descriptionPlain") or j.get("descriptionHtml") or "",
            j.get("jobUrl") or j.get("applyUrl", ""),
            (j.get("publishedAt") or "")[:10] or None)


def run():
    seen = load_seen()
    kept = {"개발": 0, "디자인": 0, "기획": 0}
    boards = []

    # ① 이미 확인된 보드
    todo = list(KNOWN)

    # ② 후보 탐색 — 세 ATS 를 돌며 응답이 있는 것만 남긴다
    print(f"후보 {len(set(CANDIDATES))}개 탐색…")
    for tok in sorted(set(CANDIDATES)):
        for kind in ("greenhouse", "lever", "ashby"):
            if (kind, tok) in todo:
                continue
            rows = fetch(kind, tok)
            if rows:
                print(f"  HIT {kind:11} {tok:20} {len(rows):>4}건", flush=True)
                todo.append((kind, tok))
                break

    # ③ 수집
    print(f"\n보드 {len(todo)}개 수집…")
    for kind, tok in todo:
        rows = fetch(kind, tok)
        if not rows:
            continue
        n0 = sum(kept.values())
        for _, _, j in rows:
            title, body, url, posted = norm(kind, tok, j)
            fam = job_family(title, "")
            if fam is None or not url:
                continue
            payload = dict(j)
            payload["_ats"] = kind
            payload["_board"] = tok
            payload["_title"] = title
            payload["_body"] = body if isinstance(body, str) else str(body)
            if save(prefix="jd", source=f"{kind}:{tok}", source_url=url, payload=payload,
                    subdir=f"jd/{kind}/{tok}", posted_at=posted, expires_at=None,
                    job_family=fam, license_=f"public-api:{kind}-job-board", seen=seen):
                kept[fam] += 1
        boards.append((kind, tok, sum(kept.values()) - n0))
        print(f"  {kind:11} {tok:20} → {sum(kept.values()) - n0:>4}건", flush=True)

    print(f"\n직군별 신규: {kept}")
    print(json.dumps(stats(), ensure_ascii=False, indent=2)[:600])


if __name__ == "__main__":
    run()
