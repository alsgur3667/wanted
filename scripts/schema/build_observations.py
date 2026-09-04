"""지금까지 모은 자료를 sources · observations 로 되채운다.

왜 되채우나
  지금 계약에는 **집계값만** 있다. docFreq 3 은 있는데 "어느 공고가 뭐라고 했는지"가 없다.
  그래서 중복·회사 편중·언어를 발견할 때마다 처음부터 다시 만들어야 했다.
  관측을 한 줄씩 남겨 두면 집계는 언제든 다시 뽑을 수 있고, 화면에서 근거 문장을 댈 수 있다.

⚠️ 절이 안 갈린 공고를 '필수'로 세지 않는다 — 이번 되채움의 핵심
  실측: 공고 2,448건 중 792건(32%)이 자격요건/우대로 안 갈려 **본문 전체가 자격요건**이 됐다.
  그 본문에는 회사 소개가 들어 있다. "Product Owner (자격요건 4,256자)" 를 열어 보니
  내용이 회사 자랑이었다. 그대로 세면 필수/우대 판정의 분자가 오염된다.
  안 갈린 공고의 관측은 stance='언급' 으로 둔다. 스키마의 stance 가 이걸 위해 있다.

세 출처를 모두 관측으로 넣는다 — 공고 · 해설 글 · 공인 체계
  ⚠️ 처음에는 공고만 넣었다. 그랬더니 agreement 가 전부 1 이 되어
     "여러 출처가 함께 말한 것" 을 구분할 수 없었다.
     실측: 새 관측으로 갈아끼우자 데이터 사이언티스트가 55%→11% 로 무너졌다.
     SQL(공고 49%)이 필수선을 아슬하게 못 넘어서인데, 예전 계약에서는
     해설·공인 체계가 함께 말해 합의 가산을 받아 넘었다.

⚠️ 해설 글의 관측은 근사다
  verified.json 은 (직무·역량)마다 **합계**만 갖고 있다 — 어느 글이 필수라 했는지는 없다.
  그래서 글 URL 에 필수→우대→언급 순으로 채워 개수를 맞춘다. 확신도를 낮게 준다.
  문장 단위로 다시 뽑으면 정확해진다 (차후).

⚠️ 공인 체계는 stance 를 '언급' 으로 둔다
  O*NET·NCS 는 "이 직업이 이걸 쓴다" 고만 말하지 필수인지 우대인지는 말하지 않는다.
  필수로 세면 공고 1건짜리 GitHub 이 임베디드의 필수가 된다 (예전에 그랬다).

⚠️ 관측은 지우지 않는다
  잘못 뽑힌 것은 reviewStatus='기각' 과 supersededBy 로 남긴다.
  extractorVersion 을 적어 두어 어느 판으로 뽑았는지 되짚을 수 있게 한다.

적용한 방침 (재현을 위해 _config.json 에 함께 적는다)
  중복 판정   본문 앞 600자 해시. 실측 482건이 잡힌다
  대표 선택   가장 최근 것 — 최신 요구가 지금의 요구다
  공공기관    직무 배정이 안 되므로 관측을 만들지 않는다 (자료로는 남긴다)

산출
  data/v2/sources.csv       ← git-ignore (원문 정보)
  data/v2/observations.csv  ← git-ignore (근거 문장 인용)
  data/v2/_config.json      ← 커밋. 어떤 방침으로 만들었나
"""
import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data" / "interim"
OUT = REPO / "data" / "v2"

sys.path.insert(0, str(REPO / "scripts" / "collect"))
from build_roles import role_of  # noqa: E402
from collect_common import RAW, word_pattern  # noqa: E402

EXTRACTOR = "rule-v4"
DUP_PREFIX = 600
QUOTE_MAX = 200

SRC_HEAD = ["id", "kind", "publisher", "company", "title", "url", "publishedAt",
            "collectedAt", "lang", "region", "license", "robotsOk", "accessMethod",
            "dupGroup", "isPrimary", "credibility", "textRef", "isSynthetic",
            "synthesisBasis"]
OBS_HEAD = ["id", "sourceId", "occupationId", "skillId", "stance", "quote", "locator",
            "extractedBy", "extractorVersion", "confidence", "observedAt",
            "reviewStatus", "reviewedBy", "supersededBy", "isSynthetic"]

#  공고를 낸 회사. 통합 게시판(remotive·jobicy·remoteok)은 알 수 없다.
def company_of(d):
    src, url = d["source"], d.get("source_url") or ""
    if ":" in src and not src.startswith(("data.go.kr", "jobicy")):
        return src.split(":", 1)[1]
    m = re.search(r"arbeitnow\.com/jobs/companies/([^/]+)/", url)
    return "arbeitnow:" + m.group(1) if m else ""


def lang_of(t):
    ko = len(re.findall(r"[가-힣]", t))
    en = len(re.findall(r"[A-Za-z]", t))
    if ko > en * 0.15:
        return "ko"
    if re.search(r"\b(und|der|die|mit|für|Erfahrung|Kenntnisse)\b", t):
        return "de"
    return "en"


REGION = {"ko": "KR", "de": "EU", "en": "GLOBAL"}


BREAK = re.compile(r"[\n•·▪◦‣]|(?<=[.!?;])\s|(?<=니다)\s|(?<=합니다)\s|(?<=해요)\s")


def sentence_of(text, start, end):
    """맞은 자리를 품은 문장 하나. 근거로 보여 줄 만큼만 자른다.

    ⚠️ 줄바꿈과 마침표만 보면 29% 가 경계를 못 찾아 200자에서 잘렸다.
       공고는 불릿(•·▪)으로 항목을 나누고, 한국어는 '~니다' 로 끝난다. 둘 다 경계로 본다.
    """
    lo, hi = 0, len(text)
    for m in BREAK.finditer(text):
        if m.end() <= start:
            lo = m.end()
        elif m.start() >= end:
            hi = m.start()
            break
    q = re.sub(r"\s+", " ", text[lo:hi]).strip(" .·-•\t")
    return q[:QUOTE_MAX]


def run():
    skills = json.loads((D / "skills.json").read_text(encoding="utf-8"))
    jobs = {j["title"]: j["id"] for j in json.loads((D / "jobs.json").read_text(encoding="utf-8"))}
    pats = [(word_pattern(t), s["id"]) for s in skills
            for t in [s["name"]] + list(s.get("aliases") or []) if len(t) >= 2]

    docs = [json.loads(l) for l in (RAW / "_corpus.jsonl").open(encoding="utf-8") if l.strip()]

    #  중복 묶기 — 앞 600자가 같으면 같은 공고로 본다. 대표는 가장 최근 것.
    group = defaultdict(list)
    for d in docs:
        key = hashlib.md5(d["text"][:DUP_PREFIX].encode("utf-8")).hexdigest()[:8]
        group[key].append(d)
    primary = set()
    for key, ds in group.items():
        ds.sort(key=lambda x: x.get("posted_at") or "", reverse=True)
        primary.add(ds[0]["id"])

    today = date.today().isoformat()
    srcs, obs = [], []
    n_unsplit = n_public = 0
    stance_cnt = Counter()

    for d in docs:
        key = hashlib.md5(d["text"][:DUP_PREFIX].encode("utf-8")).hexdigest()[:8]
        lang = lang_of(d["text"])
        public = d["source"].startswith("data.go.kr")
        srcs.append({
            "id": f"src_{d['id']}", "kind": "공고",
            "publisher": d["source"].split(":", 1)[0], "company": company_of(d),
            "title": d["title"], "url": d.get("source_url") or "",
            "publishedAt": d.get("posted_at") or "", "collectedAt": today,
            "lang": lang, "region": "KR" if public else REGION[lang],
            "license": "원문 재배포 불가", "robotsOk": "true",
            "accessMethod": "api" if d["source"].startswith(("greenhouse", "lever", "ashby",
                                                             "data.go.kr")) else "html",
            "dupGroup": f"d_{key}", "isPrimary": str(d["id"] in primary).lower(),
            "credibility": "높음", "textRef": f"corpus:{d['id']}",
            "isSynthetic": "false", "synthesisBasis": "",
        })
        if public:
            n_public += 1
            continue                      # 직무가 안 붙어 관측을 만들 수 없다
        title, _ = role_of(d["title"])
        jid = jobs.get(title or "")
        if not jid or d["id"] not in primary:
            continue

        req, pref = d.get("req_text") or "", d.get("pref_text") or ""
        #  ⚠️ 절이 안 갈린 공고 — 본문 전체가 req 로 들어와 있다. 필수로 세면 안 된다.
        unsplit = not pref.strip() and len(req) >= len(d["text"]) * 0.95
        if unsplit:
            n_unsplit += 1
        sections = ([("body", d["text"], "언급")] if unsplit
                    else [("자격요건", req, "필수"), ("우대사항", pref, "우대")])

        seen = set()
        for sec, text, stance in sections:
            if not text.strip():
                continue
            for p, sid in pats:
                m = p.search(text)
                if not m or (sid, stance) in seen:
                    continue
                seen.add((sid, stance))
                obs.append({
                    "id": f"obs_{len(obs) + 1:07d}", "sourceId": f"src_{d['id']}",
                    "occupationId": jid, "skillId": sid, "stance": stance,
                    "quote": sentence_of(text, m.start(), m.end()),
                    "locator": f"{sec}#{text[:m.start()].count(chr(10)) + 1}",
                    "extractedBy": "규칙", "extractorVersion": EXTRACTOR,
                    "confidence": "0.9" if not unsplit else "0.6",
                    "observedAt": d.get("posted_at") or today,
                    "reviewStatus": "미검토", "reviewedBy": "", "supersededBy": "",
                    "isSynthetic": "false",
                })
                stance_cnt[stance] += 1

    # ── 해설 글 ──────────────────────────────────────────────────────
    n_guide = 0
    gv = RAW / "guides" / "verified.json"
    if gv.exists():
        for r in json.loads(gv.read_text(encoding="utf-8"))["rows"]:
            urls = r.get("sources") or []
            if not urls:
                continue
            for u in urls:
                gid = "src_g_" + hashlib.md5(u.encode()).hexdigest()[:10]
                if gid not in {x["id"] for x in srcs}:
                    srcs.append({
                        "id": gid, "kind": "해설글", "publisher": u.split("/")[2] if "//" in u else "",
                        "company": "", "title": "", "url": u, "publishedAt": "",
                        "collectedAt": today, "lang": "ko", "region": "KR",
                        "license": "원문 재배포 불가", "robotsOk": "true",
                        "accessMethod": "html", "dupGroup": gid, "isPrimary": "true",
                        "credibility": "보통", "textRef": "", "isSynthetic": "false",
                        "synthesisBasis": "",
                    })
            #  합계를 URL 에 필수→우대→언급 순으로 채운다 (어느 글이 뭐라 했는지는 자료에 없다)
            plan = (["필수"] * (r.get("guideRequired") or 0)
                    + ["우대"] * (r.get("guidePreferred") or 0)
                    + ["언급"] * (r.get("guideNeutral") or 0))
            for u, stance in zip(urls, plan or ["언급"] * len(urls)):
                obs.append({
                    "id": f"obs_{len(obs) + 1:07d}",
                    "sourceId": "src_g_" + hashlib.md5(u.encode()).hexdigest()[:10],
                    "occupationId": r["jobId"], "skillId": r["skillId"], "stance": stance,
                    "quote": "", "locator": "", "extractedBy": "규칙",
                    "extractorVersion": "verify_guides-v1", "confidence": "0.6",
                    "observedAt": today, "reviewStatus": "미검토", "reviewedBy": "",
                    "supersededBy": "", "isSynthetic": "false",
                })
                stance_cnt[stance] += 1
                n_guide += 1

    # ── 공인 체계 ────────────────────────────────────────────────────
    n_onto = 0
    ov = RAW / "_ontology_reqs.json"
    if ov.exists():
        od = json.loads(ov.read_text(encoding="utf-8"))
        for sysname, sid_ in (("O*NET 31.0", "src_onet31"), ("NCS 표준직무기술서", "src_ncs")):
            srcs.append({
                "id": sid_, "kind": "공인체계", "publisher": sysname, "company": "",
                "title": sysname, "url": "", "publishedAt": "", "collectedAt": today,
                "lang": "en" if "O*NET" in sysname else "ko",
                "region": "US" if "O*NET" in sysname else "KR",
                "license": "CC BY 4.0" if "O*NET" in sysname else "공공데이터 이용허락",
                "robotsOk": "true", "accessMethod": "manual", "dupGroup": sid_,
                "isPrimary": "true", "credibility": "높음", "textRef": "",
                "isSynthetic": "false", "synthesisBasis": "",
            })
        for jid, rows_ in (od.get("jobs") or {}).items():
            for sid, v in rows_.items():
                for key, src_id in (("onet", "src_onet31"), ("ncs", "src_ncs")):
                    if not v.get(key):
                        continue
                    obs.append({
                        "id": f"obs_{len(obs) + 1:07d}", "sourceId": src_id,
                        "occupationId": jid, "skillId": sid, "stance": "언급",
                        "quote": "", "locator": "", "extractedBy": "규칙",
                        "extractorVersion": "ontology-v1", "confidence": "0.7",
                        "observedAt": today, "reviewStatus": "미검토", "reviewedBy": "",
                        "supersededBy": "", "isSynthetic": "false",
                    })
                    stance_cnt["언급"] += 1
                    n_onto += 1

    OUT.mkdir(parents=True, exist_ok=True)
    for path, head, rows in (("sources.csv", SRC_HEAD, srcs),
                             ("observations.csv", OBS_HEAD, obs)):
        with (OUT / path).open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=head)
            w.writeheader()
            w.writerows(rows)

    cfg = {"extractorVersion": EXTRACTOR, "dedup": "prefix-hash", "dedupPrefixChars": DUP_PREFIX,
           "dedupKeep": "newest", "publicPostings": "자료로만 남기고 관측은 만들지 않는다",
           "unsplitStance": "언급", "builtAt": today,
           "note": "절이 안 갈린 공고를 필수로 세지 않는다. 본문에 회사 소개가 섞여 있다."}
    (OUT / "_config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=1),
                                      encoding="utf-8")

    dup = len(docs) - len(primary)
    print(f"자료 {len(srcs):,}건 (중복으로 접은 것 {dup:,} · 공공기관 {n_public:,})")
    print(f"관측 {len(obs):,}건 — " + " · ".join(f"{k} {v:,}" for k, v in stance_cnt.most_common()))
    print(f"  절이 안 갈려 '언급' 으로 둔 공고 {n_unsplit:,}건")
    print(f"  해설 글 관측 {n_guide:,}건 · 공인 체계 관측 {n_onto:,}건")
    per_job = Counter(o["occupationId"] for o in obs)
    print(f"  직무 {len(per_job)}개 · 관측이 가장 많은 곳: "
          + " · ".join(f"{k} {v:,}" for k, v in per_job.most_common(5)))
    print(f"→ {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    run()
