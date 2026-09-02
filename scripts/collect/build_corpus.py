"""수집한 JD 6,359건에서 본문 텍스트를 뽑아 하나의 코퍼스로 만든다.

출처마다 본문 필드가 달라서 여기서 한 번 정규화해 둔다.
이후 어휘 매칭은 전부 이 코퍼스를 본다 (원본 JSON 을 다시 파싱하지 않는다).
"""
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW  # noqa: E402

OUT = RAW / "_corpus.jsonl"
TAG = re.compile(r"<[^>]+>")
WS = re.compile(r"[ \t\xa0]+")

# 제어문자와 U+2028/2029 를 지운다.
# 파이썬 splitlines() 가 U+2028/2029 도 줄바꿈으로 보기 때문에, 남겨두면 JSONL 한 줄이 쪼개진다.
BAD_CHARS = {c: " " for c in list(range(0, 9)) + [11, 12] + list(range(14, 32)) + [0x2028, 0x2029]}


# ── 자격요건 / 우대사항 가르기 ────────────────────────────────────────────
#
# 공고는 스킬을 두 칸에 나눠 적는다.
#   자격요건 = "이 정도는 다들 갖고 있어야 함"
#   우대사항 = "드물어서, 있으면 좋음"
# 우대 쪽에 자주 오르는 스킬일수록 시장이 그 사람을 구하기 어렵다는 뜻이다.
# 이것이 scarcity(희소성)의 대리지표가 된다.
# 절(節) 머리로 쓰이는 표지 — 여기부터 구간 전체가 우대다
STRONG_PREF = [
    "nice to have", "nice-to-have", "nice to haves", "preferred qualification",
    "preferred qualifications", "preferred experience", "preferred skills",
    "bonus points", "good to have", "additional qualifications",
    "우대사항", "우대 사항", "우대조건", "우대요건", "이런 분이면", "이런 경험이 있",
]
# 문장 끝에 붙는 표현 — 그 줄 하나만 우대다. 구간을 나누면 안 된다.
WEAK_PREF = [
    "is a plus", "are a plus", "it's a plus", "a plus", "bonus", "desirable",
    "preferred", "우대합니다", "우대함", "있으면 좋", "가산점",
]
# 우대 구간이 끝나는 지점. 복리후생·전형절차는 스킬이 아니고,
# 자격요건 절이 다시 나오면 거기서 우대 구간은 끝난 것이다.
PREF_END = [
    "requirements", "qualifications", "responsibilities", "what you'll do",
    "what you will do", "minimum qualifications", "basic qualifications",
    "benefits", "what we offer", "perks", "about us", "about the team", "our culture",
    "equal opportunity", "how to apply", "interview process", "compensation",
    "자격요건", "지원자격", "필수요건", "주요업무", "담당업무",
    "복리후생", "근무조건", "전형절차", "채용절차", "기타사항", "유의사항", "제출서류",
]


def split_req_pref(body: str) -> tuple[str, str]:
    """(자격요건, 우대사항).

    절 머리 표지가 있으면 그 구간을 통째로 우대로 본다.
    없고 문장 끝 표현만 있으면 그 줄만 우대로 본다 — 뒤따르는 자격요건 절까지
    우대로 삼켜버리면 희소성 지표가 통째로 망가진다.
    """
    low = body.lower()

    starts = [low.find(m) for m in STRONG_PREF]
    starts = [p for p in starts if p >= 0]
    if starts:
        start = min(starts)
        end = len(body)
        for m in PREF_END:
            e = low.find(m, start + 20)     # 표지 자신을 다시 잡지 않도록 조금 띄운다
            if e >= 0:
                end = min(end, e)
        return body[:start], body[start:end]

    pref_lines, req_lines = [], []
    for line in body.splitlines():
        ll = line.lower()
        (pref_lines if any(m in ll for m in WEAK_PREF) else req_lines).append(line)
    if pref_lines:
        return "\n".join(req_lines), "\n".join(pref_lines)
    return body, ""


def text_of(source: str, p: dict) -> tuple[str, str]:
    """(제목, 본문) 을 돌려준다."""
    if source.startswith("greenhouse"):
        return p.get("title", ""), p.get("content", "")
    if source == "arbeitnow":
        return p.get("title", ""), p.get("description", "")
    if source.startswith("jobicy"):
        return p.get("jobTitle", ""), f"{p.get('jobExcerpt','')}\n{p.get('jobDescription','')}"
    if source == "remotive":
        return p.get("title", ""), p.get("description", "")
    if source == "remoteok":
        return p.get("position", ""), p.get("description", "")
    if source.startswith("data.go.kr"):
        # 전형방법(scrnprcdrMthdExpln)·우대조건(prefCondCn)은 넣지 않는다.
        # 취업지원대상자·보훈·장애인 가점 같은 법정 상용구라 직무 정보가 없고,
        # 넣으면 그 말들이 빈도 상위를 전부 차지한다.
        return p.get("recrutPbancTtl", ""), "\n".join(
            str(p.get(k) or "") for k in ("aplyQlfcCn", "prefCn"))
    return p.get("title", ""), ""


def clean(s: str) -> str:
    s = html.unescape(str(s or ""))
    s = s.translate(BAD_CHARS)
    s = TAG.sub(" ", s)
    s = WS.sub(" ", s)
    return re.sub(r"\n{2,}", "\n", s).strip()


def run():
    man = []
    with (RAW / "_manifest.jsonl").open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                man.append(json.loads(line))

    jd = [m for m in man if m["id"].startswith("jd_")]
    n_empty = 0
    with OUT.open("w", encoding="utf-8") as f:
        for m in jd:
            fp = RAW / m["raw_path"]
            if not fp.exists():
                continue
            p = json.loads(fp.read_text(encoding="utf-8"))
            title, body = text_of(m["source"], p)
            title, body = clean(title), clean(body)
            if len(body) < 30:
                n_empty += 1

            if m["source"].startswith("data.go.kr"):
                # 공공기관 공고는 필드가 이미 나뉘어 있다. 본문을 쪼갤 필요가 없다.
                req = clean(p.get("aplyQlfcCn"))
                pref = clean(p.get("prefCn"))
            else:
                req, pref = split_req_pref(body)

            f.write(json.dumps({
                "id": m["id"], "source": m["source"], "job_family": m["job_family"],
                "posted_at": m["posted_at"], "expires_at": m["expires_at"],
                "source_url": m["source_url"],
                "title": title, "text": body[:12000],
                "req_text": req[:12000], "pref_text": pref[:12000],
            }, ensure_ascii=False) + "\n")
    print(f"코퍼스 {len(jd):,}건 → {OUT.name} · 본문 30자 미만 {n_empty:,}건")


if __name__ == "__main__":
    run()
