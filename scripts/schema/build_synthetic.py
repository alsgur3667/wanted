"""표본이 얇은 곳을 가상 자료로 메운다 — 반드시 표시를 남긴다.

왜 만드나
  · 이력서가 **한 건도 없다.** 매칭을 끝까지 돌려 보거나 화면을 보여줄 수가 없다.
  · 모션·영상 디자이너는 공고가 6건이라 화면이 비어 보인다.

⚠️ 가상 자료는 정보를 더해 주지 않는다
  6건에서 뽑은 분포로 40건을 만들면 그 6건을 되풀이하는 것뿐이다.
  얇은 표본 문제는 이걸로 안 풀린다. **화면이 깨져 보이지 않게 하는 것**이 목적이다.
  보고서에는 "표본이 얇아 보완했고 채점에는 쓰지 않았다"로 적어야 정확하다.

⚠️ 채점에는 절대 쓰지 않는다
  가상 공고로 만든 통계로 우리 추천기를 채점하면 자기가 만든 답안지로 채점하는 것이 된다.
  채점은 설문 봉인분(3,420건)으로만 한다. 그래서 모든 줄에 isSynthetic 을 남긴다.

어떻게 만드나
  공고  그 직무의 **변형**을 비율대로 고르고, 변형 안에서 역량을 관측된 확률로 뽑는다.
        평평한 분포에서 뽑으면 함께 나오지 않는 역량이 한 공고에 섞인다
        (iOS 와 Kotlin 이 같이 나오는 식). 변형을 거치면 그 짝이 유지된다.
  이력서 직무를 고르고 그 직무의 변형에서 역량을 뽑되, **일부러 빈틈을 낸다** —
        필수를 전부 갖춘 사람만 만들면 '부족 역량' 화면을 시험할 수 없다.

연봉을 어떻게 뿌리나 (실제 JD 를 흉내 낸다)
  기준은 고용24 직업정보의 **실제 연봉 구간**이다 (data/v2/occupation_salary.csv).
  ⚠️ 그 구간의 최상단이 "5천만원 이상" 이라 24직무 중 21개가 같은 칸에 몰린다.
     구간만 쓰면 화면에서 직무가 구분되지 않는다. 그래서 구간 안에서 흩뿌린다.

  · 연차에 따라 올린다      신입은 구간 하단, 시니어는 상단 위로
  · 회사 규모에 따라 흔든다  ±15% 안에서
  · 실제 JD 처럼 형태를 섞는다
      범위 제시  "4,200~5,400만원"      45%
      하한만     "4,500만원 이상"        20%
      회사내규   "회사 내규에 따름"        20%
      협의       "면접 후 협의"           15%
  ⚠️ 이 값은 **가상이다.** 발표에는 이 숫자를 쓰지 않는다 —
     발표에는 occupation_salary.csv 의 실제 구간을 쓴다.

산출
  data/v2/synthetic_sources.csv       가상 공고 (isSynthetic=true)
  data/v2/synthetic_observations.csv  거기서 나온 관측
  data/v2/synthetic_profiles.csv      가상 이력서
  ※ 실제 자료 파일에 섞어 쓰지 않는다. 합칠지는 집계 단계에서 정한다.
"""
import csv
import json
import random
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data" / "interim"
OUT = REPO / "data" / "v2"

sys.path.insert(0, str(REPO / "scripts" / "collect"))
from build_roles import role_of  # noqa: E402
from collect_common import RAW, word_pattern  # noqa: E402

SEED = 20260904
TARGET_POSTINGS = 40      # 직무마다 이만큼까지 채운다 (실제 + 가상)

#  연봉 표기 형태와 비율 — 실제 공고에서 흔한 순서대로
SAL_FORMS = [("range", 0.45), ("min", 0.20), ("내규", 0.20), ("협의", 0.15)]
LEVELS = [("신입", 0.20, -0.10), ("주니어", 0.30, 0.00),
          ("시니어", 0.35, 0.18), ("리드", 0.15, 0.35)]
N_PROFILES = 400          # 가상 이력서 수
UBI_NAMES = {"Git", "GitHub", "GitLab", "Jira", "Confluence", "Slack", "Notion"}


def variants_of(sets, rnd_state=7):
    """공고 묶음을 역량 조합으로 갈라 변형을 만든다."""
    if len(sets) < 12:
        cnt = Counter(x for s in sets for x in s)
        n = len(sets)
        return [{"p": {s: v / n for s, v in cnt.items()}, "share": 1.0, "n": n}]
    vocab = sorted({x for s in sets for x in s})
    idx = {v: i for i, v in enumerate(vocab)}
    X = np.zeros((len(sets), len(vocab)), dtype=np.float32)
    for i, s in enumerate(sets):
        for x in s:
            X[i, idx[x]] = 1
    X = X / np.maximum(1, np.linalg.norm(X, axis=1, keepdims=True))
    k = min(3, max(2, len(sets) // 15))
    km = KMeans(n_clusters=k, n_init=10, random_state=rnd_state).fit(X)
    out = []
    for c in range(k):
        mem = [i for i in range(len(sets)) if km.labels_[i] == c]
        if len(mem) < 3:
            continue
        cnt = Counter(x for i in mem for x in sets[i])
        out.append({"p": {s: v / len(mem) for s, v in cnt.items()},
                    "share": len(mem) / len(sets), "n": len(mem)})
    return out or [{"p": {}, "share": 1.0, "n": 0}]


def run():
    rnd = random.Random(SEED)
    skills = json.loads((D / "skills.json").read_text(encoding="utf-8"))
    name = {s["id"]: s["name"] for s in skills}
    jobs = json.loads((D / "jobs.json").read_text(encoding="utf-8"))
    title2id = {j["title"]: j["id"] for j in jobs}
    jt = {j["id"]: j["title"] for j in jobs}
    pats = [(word_pattern(t), s["id"]) for s in skills
            for t in [s["name"]] + list(s.get("aliases") or []) if len(t) >= 2]
    ubi = {s["id"] for s in skills if s["name"] in UBI_NAMES}

    #  실제 공고에서 직무별 역량 조합을 읽는다
    per = defaultdict(list)
    for line in (RAW / "_corpus.jsonl").open(encoding="utf-8"):
        if not line.strip():
            continue
        d = json.loads(line)
        if d["source"].startswith("data.go.kr"):
            continue
        t, _ = role_of(d["title"])
        jid = title2id.get(t or "")
        if not jid:
            continue
        s = {sid for p, sid in pats if p.search(d["text"])} - ubi
        if len(s) >= 3:
            per[jid].append(s)

    VAR = {jid: variants_of(sets) for jid, sets in per.items()}
    today = date.today()

    #  실제 연봉 구간을 읽는다. 없으면 연봉을 적지 않는다 — 지어내지 않는다.
    salary = {}
    sp = OUT / "occupation_salary.csv"
    if sp.exists():
        for r in csv.DictReader(sp.open(encoding="utf-8-sig")):
            if r["salaryLow"] and r["salaryHigh"]:
                salary[r["occupationId"]] = (int(r["salaryLow"]), int(r["salaryHigh"]))

    def salary_text(jid, level_shift):
        band = salary.get(jid)
        if not band:
            return "", "", ""
        lo, hi = band
        span = hi - lo
        base = lo + span * (0.15 + level_shift) + span * rnd.uniform(-0.15, 0.15)
        base = max(2400, round(base / 100) * 100)
        form = rnd.choices([f for f, _ in SAL_FORMS], weights=[w for _, w in SAL_FORMS])[0]
        top = round((base + span * rnd.uniform(0.25, 0.5)) / 100) * 100
        if form == "range":
            return f"{base:,.0f}~{top:,.0f}만원", int(base), int(top)
        if form == "min":
            return f"{base:,.0f}만원 이상", int(base), ""
        if form == "내규":
            return "회사 내규에 따름", "", ""
        return "면접 후 협의", "", ""

    src_rows, obs_rows, prof_rows = [], [], []
    made = Counter()
    for jid, vs in VAR.items():
        need = max(0, TARGET_POSTINGS - len(per[jid]))
        for i in range(need):
            v = rnd.choices(vs, weights=[x["share"] for x in vs])[0]
            vi = vs.index(v) + 1
            picked = [s for s, p in v["p"].items() if rnd.random() < p]
            if len(picked) < 3:
                picked = [s for s, _ in sorted(v["p"].items(), key=lambda x: -x[1])[:4]]
            sid = f"syn_{jid}_{i + 1:03d}"
            posted = today - timedelta(days=rnd.randint(10, 300))
            lv, shift = rnd.choices(LEVELS, weights=[w for _, w, _ in LEVELS])[0][0], 0
            for n_, w_, sh_ in LEVELS:
                if n_ == lv:
                    shift = sh_
            sal_txt, sal_lo, sal_hi = salary_text(jid, shift)
            src_rows.append({
                "id": sid, "kind": "합성공고", "publisher": "synthetic", "company": "",
                "title": f"[가상] {lv} {jt[jid]} ({vi}형)", "url": "",
                "salaryText": sal_txt, "salaryLow": sal_lo, "salaryHigh": sal_hi,
                "level": lv,
                "publishedAt": posted.isoformat(), "collectedAt": today.isoformat(),
                "lang": "ko", "region": "KR", "license": "내부 생성", "robotsOk": "true",
                "accessMethod": "manual", "dupGroup": f"dsyn_{jid}_{i}", "isPrimary": "true",
                "credibility": "낮음", "textRef": "", "isSynthetic": "true",
                "synthesisBasis": f"{jid}.v{vi} (실제 {v['n']}건 분포)",
            })
            #  실제 공고의 절 비율을 흉내 낸다 — 앞쪽은 자격요건, 뒤쪽은 우대
            cut = max(1, int(len(picked) * 0.65))
            for k, s in enumerate(picked):
                stance = "필수" if k < cut else "우대"
                obs_rows.append({
                    "id": f"obs_syn_{len(obs_rows) + 1:06d}", "sourceId": sid,
                    "occupationId": jid, "skillId": s, "stance": stance,
                    "quote": f"[가상] {name.get(s, s)} 경험",
                    "locator": "자격요건#1" if stance == "필수" else "우대사항#1",
                    "extractedBy": "합성", "extractorVersion": "synth-v1",
                    "confidence": "0.5", "observedAt": posted.isoformat(),
                    "reviewStatus": "미검토", "reviewedBy": "", "supersededBy": "",
                    "isSynthetic": "true",
                })
            made[jid] += 1

    #  ── 가상 이력서 ────────────────────────────────────────────────
    #  일부러 빈틈을 낸다. 필수를 다 갖춘 사람만 만들면 '부족 역량' 화면을 시험할 수 없다.
    ids = [j for j in VAR if per[j]]
    for i in range(N_PROFILES):
        jid = rnd.choice(ids)
        vs = VAR[jid]
        v = rnd.choices(vs, weights=[x["share"] for x in vs])[0]
        keep = rnd.uniform(0.45, 0.95)        # 이만큼만 갖춘 사람
        have = [s for s, p in v["p"].items() if rnd.random() < p * keep]
        if len(have) < 3:
            have = [s for s, _ in sorted(v["p"].items(), key=lambda x: -x[1])[:3]]
        years = round(rnd.choice([0.5, 1, 2, 3, 5, 8, 12]) * rnd.uniform(0.8, 1.2), 1)
        prof_rows.append({
            "sessionId": f"syn_p_{i + 1:04d}", "createdAt": today.isoformat(),
            "inputMethod": "직접입력", "totalYears": years,
            "currentOccupationId": jid, "targetFamily": "",
            "weeklyStudyHours": rnd.choice([2, 4, 6, 10]),
            "isSynthetic": "true",
            "skillIds": "|".join(have),
            "levels": "|".join(rnd.choice(["써봄", "능숙", "주도"]) for _ in have),
        })

    OUT.mkdir(parents=True, exist_ok=True)
    for path, rows in (("synthetic_sources.csv", src_rows),
                       ("synthetic_observations.csv", obs_rows),
                       ("synthetic_profiles.csv", prof_rows)):
        if not rows:
            continue
        with (OUT / path).open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)

    print(f"가상 공고 {len(src_rows):,}건 · 관측 {len(obs_rows):,}건 · 이력서 {len(prof_rows):,}건")
    print(f"  목표 {TARGET_POSTINGS}건까지 채운 직무 {len(made)}개")
    for jid, c in made.most_common(8):
        print(f"    {jt[jid][:16]:18} 실제 {len(per[jid]):>3}건 + 가상 {c:>3}건"
              f" · 변형 {len(VAR[jid])}개")
    print(f"→ {OUT.relative_to(REPO)}  (전부 isSynthetic=true — 채점에 쓰지 않는다)")


if __name__ == "__main__":
    run()
