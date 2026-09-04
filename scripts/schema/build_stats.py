"""관측을 모아 job_skill_stats 를 만든다 — 가상이 섞인 자리는 반드시 드러낸다.

무엇이 달라지나
  지금 계약의 docFreq 는 "몇 건의 공고에 나왔나" 하나뿐이다.
  여기서는 관측에서 다시 세기 때문에 **몇 개 회사가 말했나**, **몇 %가 말했나**,
  **가상이 몇 건 섞였나** 를 함께 낸다.

  · nCompanies  어제는 회사명 규칙과 15% 문턱으로 뒤늦게 막던 것이 여기서 바로 보인다.
                실측: 엔지니어링 리더의 Ruby 는 공고 6건인데 회사는 1곳이었다.
  · share       표본 크기에 안 휘둘린다. 119건 중 56건과 15건 중 7건이 같은 47% 로 잡힌다.
  · nSynthetic  이 수치에 가상이 몇 건 섞였나.
  · shareReal   가상을 뺀 실제 자료만으로 다시 잰 비율.
                share 와 크게 다르면 **그 수치는 가상이 만든 것**이다.

⚠️ 여기의 tier 는 공고만 본 것이다
  해설 글·공인 체계는 아직 관측으로 되채우지 않았다(공고만 했다).
  그래서 이 표의 tier 를 그대로 계약에 쓰면 안 된다 — 지금은 대조용이다.

산출: data/v2/job_skill_stats.csv
"""
import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
V = REPO / "data" / "v2"
D = REPO / "data" / "interim"

MUST_MIN_SHARE = 0.15     # 필수는 그 직무 자료의 이 비율 이상에 나와야 한다
HEAD = ["occupationId", "skillId", "window", "nObs", "nSources", "nCompanies",
        "reqCount", "prefCount", "negCount", "share", "lift", "importance", "tier",
        "agreement", "computedAt", "configHash", "nSynthetic", "shareReal"]


def load(path):
    p = V / path
    return list(csv.DictReader(p.open(encoding="utf-8-sig"))) if p.exists() else []


def quarter(d):
    if not d or len(d) < 7:
        return None
    y, m = d[:4], int(d[5:7])
    return f"{y}Q{(m - 1) // 3 + 1}"


def run():
    src = {s["id"]: s for s in load("sources.csv") + load("synthetic_sources.csv")}
    obs = load("observations.csv") + load("synthetic_observations.csv")
    if not obs:
        raise SystemExit("관측이 없다. build_observations.py 를 먼저 돌릴 것.")

    #  창(window)마다 그 직무의 자료가 몇 건인지 — share 의 분모
    denom = defaultdict(set)          # (job, window) -> {sourceId}
    denom_real = defaultdict(set)
    for o in obs:
        s = src.get(o["sourceId"], {})
        syn = o.get("isSynthetic") == "true"
        for w in ("all", quarter(o["observedAt"])):
            if not w:
                continue
            denom[(o["occupationId"], w)].add(o["sourceId"])
            if not syn:
                denom_real[(o["occupationId"], w)].add(o["sourceId"])

    cell = defaultdict(lambda: {"obs": 0, "src": set(), "co": set(), "req": 0, "pref": 0,
                                "neg": 0, "syn": 0, "srcReal": set()})
    for o in obs:
        s = src.get(o["sourceId"], {})
        syn = o.get("isSynthetic") == "true"
        for w in ("all", quarter(o["observedAt"])):
            if not w:
                continue
            c = cell[(o["occupationId"], o["skillId"], w)]
            c["obs"] += 1
            c["src"].add(o["sourceId"])
            if s.get("company"):
                c["co"].add(s["company"])
            if syn:
                c["syn"] += 1
            else:
                c["srcReal"].add(o["sourceId"])
            c["req"] += o["stance"] == "필수"
            c["pref"] += o["stance"] == "우대"
            c["neg"] += o["stance"] == "부정"

    #  lift = 이 직무의 등장 비율 / 전체 평균 등장 비율
    base = defaultdict(lambda: [0, 0])
    for (jid, sid, w), c in cell.items():
        if w != "all":
            continue
        base[sid][0] += len(c["src"])
        base[sid][1] += len(denom[(jid, "all")])
    total_docs = sum(len(v) for (j, w), v in denom.items() if w == "all") or 1

    rows = []
    today = date.today().isoformat()
    cfg = json.loads((V / "_config.json").read_text(encoding="utf-8")) if (V / "_config.json").exists() else {}
    chash = f"cfg_{abs(hash(json.dumps(cfg, sort_keys=True))) % 0xffff:04x}"

    for (jid, sid, w), c in cell.items():
        n_all = len(denom[(jid, w)]) or 1
        n_real = len(denom_real[(jid, w)])
        share = len(c["src"]) / n_all
        share_real = (len(c["srcReal"]) / n_real) if n_real else 0.0
        b = base[sid]
        lift = (share / (b[0] / b[1])) if w == "all" and b[1] and b[0] else None
        #  ⚠️ 공고만 본 판정이다. 해설·공인 체계는 아직 관측으로 안 들어왔다.
        if c["req"] + c["pref"] == 0:
            tier = ""
        elif share < MUST_MIN_SHARE:
            tier = "우대"
        else:
            tier = "필수" if c["req"] > c["pref"] else "우대"
        rows.append({
            "occupationId": jid, "skillId": sid, "window": w,
            "nObs": c["obs"], "nSources": len(c["src"]), "nCompanies": len(c["co"]),
            "reqCount": c["req"], "prefCount": c["pref"], "negCount": c["neg"],
            "share": round(share, 4), "lift": round(lift, 2) if lift else "",
            "importance": round(share * min(3.0, lift or 1), 4),
            "tier": tier, "agreement": 1, "computedAt": today, "configHash": chash,
            "nSynthetic": c["syn"], "shareReal": round(share_real, 4),
        })

    rows.sort(key=lambda r: (r["occupationId"], r["window"], -r["importance"]))
    with (V / "job_skill_stats.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w_ = csv.DictWriter(f, fieldnames=HEAD)
        w_.writeheader()
        w_.writerows(rows)

    allr = [r for r in rows if r["window"] == "all"]
    syn_rows = [r for r in allr if r["nSynthetic"]]
    print(f"줄 {len(rows):,}개 (창 all {len(allr):,} · 분기별 {len(rows) - len(allr):,})")
    print(f"  가상이 섞인 줄 {len(syn_rows):,}개")

    #  가상이 만들어 낸 수치를 짚는다 — share 와 shareReal 이 크게 다른 곳
    gap = sorted((r for r in syn_rows if r["shareReal"] > 0 or r["share"] >= 0.3),
                 key=lambda r: -(r["share"] - r["shareReal"]))[:8]
    names = {s["id"]: s["name"] for s in json.loads((D / "skills.json").read_text(encoding="utf-8"))}
    jt = {j["id"]: j["title"] for j in json.loads((D / "jobs.json").read_text(encoding="utf-8"))}
    print("\n  가상이 비율을 크게 올린 자리 (share vs shareReal)")
    for r in gap:
        print(f"    {jt.get(r['occupationId'], r['occupationId'])[:14]:16}"
              f"{names.get(r['skillId'], r['skillId'])[:14]:16}"
              f"{r['share']:>7.0%} → 실제 {r['shareReal']:>5.0%}"
              f"   가상 {r['nSynthetic']}건")

    print("\n  한 회사만 말한 필수 (예전에는 규칙으로 뒤늦게 막던 것)")
    solo = [r for r in allr if r["tier"] == "필수" and r["nCompanies"] == 1 and r["nSources"] >= 3]
    for r in sorted(solo, key=lambda r: -r["nSources"])[:6]:
        print(f"    {jt.get(r['occupationId'], '')[:14]:16}{names.get(r['skillId'], '')[:14]:16}"
              f"자료 {r['nSources']:>3}건 · 회사 1곳 · 비율 {r['share']:.0%}")
    print(f"\n→ {(V / 'job_skill_stats.csv').relative_to(REPO)}")


if __name__ == "__main__":
    run()
