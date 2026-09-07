"""같은 직무 안의 서로 다른 자리를 찾아 occupation_variants 를 만든다.

왜 필요한가
  풀스택 공고 49건을 역량 조합으로 묶으면 셋으로 갈린다.
    v1 (27건) React 89% · TypeScript 81% · Node.js 63%     JS 계열
    v2 (11건) Docker 100% · AWS 91% · Python 82% · K8s 73%  인프라 겸업
    v3 (11건) Java 64% · Spring 55% · Vue 36%               Java·PHP 계열
  지금 필수 목록(React·TypeScript·Node.js·Docker·JavaScript)은 **v1 만 대표**한다.
  v3 의 Java 풀스택 지원자는 이 목록에서 하나도 못 채운다. 그 사람에게 "부적합"은 틀린 답이다.

⚠️ 순위 계산에는 쓰지 않는다 — 실측으로 확인했다
  변형별로 가장 잘 맞는 것을 골라 재면 **모든 직무가 그 사람에게 맞는 얼굴을 하나씩** 갖는다.
  정답 직무를 알아보는 정도는 51%→59% 로 올랐지만, 순위는 1위 31.1%→28.4% 로 내렸다.
  변별력이 줄기 때문이다. 그래서 **설명과 부족 역량**에만 쓴다.

산출: data/v2/occupation_variants.csv (커밋)
"""
import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data" / "interim"
OUT = REPO / "data" / "v2"

sys.path.insert(0, str(REPO / "scripts" / "collect"))
from build_roles import role_of  # noqa: E402
from collect_common import RAW, word_pattern  # noqa: E402

MIN_FOR_SPLIT = 12       # 이보다 적으면 나누지 않는다 — 나눠 봐야 같은 것이 나온다
MIN_MEMBERS = 3          # 묶음이 이보다 작으면 버린다
MUST_P, NICE_P = 0.5, 0.25
UBI_NAMES = {"Git", "GitHub", "GitLab", "Jira", "Confluence", "Slack", "Notion"}
HEAD = ["occupationId", "variantId", "label", "share", "nSources",
        "mustSkills", "niceSkills", "computedAt", "note"]


def variants_of(sets, seed=7):
    """역량 조합이 비슷한 공고끼리 묶는다. [{p, share, n}] 를 돌려준다."""
    if len(sets) < MIN_FOR_SPLIT:
        cnt = Counter(x for s in sets for x in s)
        n = max(1, len(sets))
        return [{"p": {s: v / n for s, v in cnt.items()}, "share": 1.0, "n": len(sets)}]
    vocab = sorted({x for s in sets for x in s})
    idx = {v: i for i, v in enumerate(vocab)}
    X = np.zeros((len(sets), len(vocab)), dtype=np.float32)
    for i, s in enumerate(sets):
        for x in s:
            X[i, idx[x]] = 1
    #  길이로 안 휘둘리게 정규화 — 역량을 많이 적은 공고가 따로 묶이면 안 된다
    X = X / np.maximum(1, np.linalg.norm(X, axis=1, keepdims=True))
    k = min(3, max(2, len(sets) // 15))
    km = KMeans(n_clusters=k, n_init=10, random_state=seed).fit(X)
    out = []
    for c in range(k):
        mem = [i for i in range(len(sets)) if km.labels_[i] == c]
        if len(mem) < MIN_MEMBERS:
            continue
        cnt = Counter(x for i in mem for x in sets[i])
        out.append({"p": {s: v / len(mem) for s, v in cnt.items()},
                    "share": len(mem) / len(sets), "n": len(mem)})
    return out or [{"p": {}, "share": 1.0, "n": 0}]


def label_of(names):
    """사람이 읽을 이름. 가장 특징적인 역량 둘을 붙인다."""
    return " · ".join(names[:2]) + " 계열" if names else "기타"


def skill_sets():
    """직무별로 '공고 하나 = 역량 집합' 을 만든다."""
    skills = json.loads((D / "skills.json").read_text(encoding="utf-8"))
    jobs = {j["title"]: j["id"] for j in json.loads((D / "jobs.json").read_text(encoding="utf-8"))}
    pats = [(word_pattern(t), s["id"]) for s in skills
            for t in [s["name"]] + list(s.get("aliases") or []) if len(t) >= 2]
    ubi = {s["id"] for s in skills if s["name"] in UBI_NAMES}
    per = defaultdict(list)
    for line in (RAW / "_corpus.jsonl").open(encoding="utf-8"):
        if not line.strip():
            continue
        d = json.loads(line)
        if d["source"].startswith("data.go.kr"):
            continue
        t, _ = role_of(d["title"])
        jid = jobs.get(t or "")
        if not jid:
            continue
        s = {sid for p, sid in pats if p.search(d["text"])} - ubi
        if len(s) >= 3:
            per[jid].append(s)
    return per, {s["id"]: s["name"] for s in skills}


def run():
    per, name = skill_sets()
    jt = {j["id"]: j["title"]
          for j in json.loads((D / "jobs.json").read_text(encoding="utf-8"))}
    today = date.today().isoformat()

    rows = []
    for jid, sets in sorted(per.items()):
        vs = variants_of(sets)
        for i, v in enumerate(vs, 1):
            must = [s for s, p in v["p"].items() if p >= MUST_P]
            nice = [s for s, p in v["p"].items() if NICE_P <= p < MUST_P]
            #  이름은 그 변형에서 가장 자주 나오면서 **다른 변형과 다른** 것으로 짓는다
            others = Counter()
            for w in vs:
                if w is not v:
                    for s, p in w["p"].items():
                        others[s] = max(others[s], p)
            distinct = sorted(must, key=lambda s: -(v["p"][s] - others.get(s, 0)))
            rows.append({
                "occupationId": jid, "variantId": f"{jid}.v{i}",
                "label": label_of([name.get(s, s) for s in distinct]),
                "share": round(v["share"], 3), "nSources": v["n"],
                "mustSkills": "|".join(sorted(must, key=lambda s: -v["p"][s])),
                "niceSkills": "|".join(sorted(nice, key=lambda s: -v["p"][s])),
                "computedAt": today,
                "note": "" if len(vs) > 1 else "표본이 얇아 나누지 않았다",
            })

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "occupation_variants.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEAD)
        w.writeheader()
        w.writerows(rows)

    multi = sorted({r["occupationId"] for r in rows if r["share"] < 1.0})
    print(f"직무 {len(per)}개 · 변형 {len(rows)}개 (둘 이상으로 갈린 직무 {len(multi)}개)")
    for jid in multi[:6]:
        print(f"\n  [{jt.get(jid, jid)}]")
        for r in [x for x in rows if x["occupationId"] == jid]:
            top = " · ".join(name.get(s, s) for s in r["mustSkills"].split("|")[:5])
            print(f"    {r['variantId']:22}{r['nSources']:>3}건 {r['share']:>5.0%}  {r['label'][:26]:28}{top}")
    print(f"\n→ {(OUT / 'occupation_variants.csv').relative_to(REPO)}")


if __name__ == "__main__":
    run()
