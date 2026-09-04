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

합의(agreement)는 **출처 종류 수**다
  공고·해설 글·공인 체계 중 몇 종류가 말했나. 셋이 함께 말한 것이 한 곳만 말한 것보다 믿을 만하다.
  ⚠️ 처음엔 공고만 관측으로 넣어 agreement 가 전부 1 이었다. 그러자 갈아끼웠을 때
     데이터 사이언티스트가 55%→11% 로 무너졌다 — SQL 이 필수선을 아슬하게 못 넘어서다.

범용 도구는 필수가 되지 못한다
  ⚠️ lift 가 재는 것은 "공고가 얼마나 자주 적나" 이지 "지원자를 얼마나 가르나" 가 아니다.
     GitHub 은 풀스택 공고의 29% 가 적어 lift 3.15 로 나오지만, 지원자는 거의 다 갖고 있어
     아무도 가르지 못한다. 그런데 필수로 올라가면 두 가지가 함께 망가진다.
       ① 누구나 그 칸을 채워 풀스택의 필수 충족률이 부풀려진다 (0.40 → 0.60)
       ② 직무 보정이 거꾸로 오른다 — 범용 도구가 필수에 있으면 '흡수되지 않는 고유한 직무'
          로 계산된다 (풀스택 0.60 → 0.73)
  ⚠️ 자동으로는 못 가른다. 엔트로피로 재면 Elasticsearch·Matlab 처럼
     **어디서나 2~3% 씩만 나오는 희귀 역량**이 함께 걸린다. 근거를 적어 손으로 표시한다
     — data/v2/skills_meta.csv

필수/우대 판정도 출처마다 무게가 다르다
  공고의 절 위치는 문서에 적힌 것이라 무게 2, 해설 글의 말투는 1.
  공인 체계는 표를 던지지 않는다 — "쓴다"고만 말하지 필수인지는 말하지 않는다.

산출: data/v2/job_skill_stats.csv
"""
import csv
import json
import os
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
V = REPO / "data" / "v2"
D = REPO / "data" / "interim"

MUST_MIN_SHARE = 0.15     # 필수는 그 직무 자료의 이 비율 이상에 나와야 한다

#  합의 가산 — 출처가 하나 늘 때마다 강도를 이만큼 올린다.
#  ⚠️ 1.0 으로 자르지 않는다. 자르면 가장 확실한 것들이 같은 값이 되어
#     필수선(1위 × 0.4)이 흔들린다.
AGREE_BONUS = float(os.environ.get("AGREE_BONUS", "0.25"))
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
    #  범용 도구 — 직무를 안 가리므로 필수로 올리지 않는다
    ubi = {r["skillId"] for r in load("skills_meta.csv") if r.get("isUbiquitous") == "true"}
    src = {s["id"]: s for s in load("sources.csv") + load("synthetic_sources.csv")}
    obs = load("observations.csv") + load("synthetic_observations.csv")
    if not obs:
        raise SystemExit("관측이 없다. build_observations.py 를 먼저 돌릴 것.")

    #  창(window)마다 그 직무의 자료가 몇 건인지 — share 의 분모
    denom = defaultdict(set)          # (job, window) -> {sourceId}
    denom_real = defaultdict(set)
    denom_jd = defaultdict(set)       # 공고만 — lift 의 기저
    for o in obs:
        s = src.get(o["sourceId"], {})
        syn = o.get("isSynthetic") == "true"
        for w in ("all", quarter(o["observedAt"])):
            if not w:
                continue
            denom[(o["occupationId"], w)].add(o["sourceId"])
            if src.get(o["sourceId"], {}).get("kind") in ("공고", "합성공고"):
                denom_jd[(o["occupationId"], w)].add(o["sourceId"])
            if not syn:
                denom_real[(o["occupationId"], w)].add(o["sourceId"])

    cell = defaultdict(lambda: {"obs": 0, "src": set(), "co": set(), "req": 0, "pref": 0,
                                "neg": 0, "syn": 0, "srcReal": set(), "kinds": set(),
                                "gReq": 0, "gPref": 0, "srcJD": set()})
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
            kind = s.get("kind", "공고")
            c["kinds"].add("공고" if kind in ("공고", "합성공고") else kind)
            if kind in ("공고", "합성공고"):
                c["srcJD"].add(o["sourceId"])
            if kind == "해설글":
                c["gReq"] += o["stance"] == "필수"
                c["gPref"] += o["stance"] == "우대"
            else:
                c["req"] += o["stance"] == "필수"
                c["pref"] += o["stance"] == "우대"
            c["neg"] += o["stance"] == "부정"

    #  lift = 이 직무의 등장 비율 / 전체 평균 등장 비율
    #
    #  ⚠️ 기저를 **공고로만** 한정해 봤다. 공인 체계가 한 역량을 여러 직무에 언급해
    #     널리 쓰이는 역량의 lift 를 누른다고 봤고, 실제로 데이터 사이언티스트의 SQL 이
    #     lift 3.0 → 1.59 로 떨어져 필수선을 못 넘고 있었다.
    #     그런데 **실측이 반대였다** — 1위 정답률 28.7% → 27.8% 로 내렸다.
    #     논리가 그럴듯해도 재 보지 않으면 알 수 없다. 전체 관측을 기저로 되돌린다.
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
        n_jd = len(denom_jd[(jid, w)])
        share_jd = (len(c["srcJD"]) / n_jd) if n_jd else 0
        share_real = (len(c["srcReal"]) / n_real) if n_real else 0.0
        b = base[sid]
        lift = (share / (b[0] / b[1])) if w == "all" and b[1] and b[0] else None
        #  ⚠️ 공고만 본 판정이다. 해설·공인 체계는 아직 관측으로 안 들어왔다.
        #  공고 절 위치는 무게 2 · 해설 말투는 1. 공인 체계는 표를 던지지 않는다.
        req_vote = (2 if c["req"] > c["pref"] else 0) + (1 if c["gReq"] > c["gPref"] else 0)
        pre_vote = (2 if c["pref"] > c["req"] else 0) + (1 if c["gPref"] > c["gReq"] else 0)
        if sid in ubi:
            tier = "우대"          # 범용 도구는 필수가 되지 못한다
        elif c["req"] + c["pref"] + c["gReq"] + c["gPref"] == 0:
            tier = ""
        elif share < MUST_MIN_SHARE and c["gReq"] == 0:
            #  그 직무 자료의 15% 도 안 되면 필수로 보지 않는다.
            #  해설 글이 필수라 한 것은 면제한다 — 공고에 덜 나와도 다른 근거다.
            tier = "우대"
        elif req_vote != pre_vote:
            tier = "필수" if req_vote > pre_vote else "우대"
        else:
            tier = "필수" if (c["req"] + c["gReq"]) >= (c["pref"] + c["gPref"]) else "우대"
        rows.append({
            "occupationId": jid, "skillId": sid, "window": w,
            "nObs": c["obs"], "nSources": len(c["src"]), "nCompanies": len(c["co"]),
            "reqCount": c["req"], "prefCount": c["pref"], "negCount": c["neg"],
            "share": round(share, 4), "lift": round(lift, 2) if lift else "",
            #  ⚠️ 여기에 lift 를 곱하지 않는다. 앱이 imp = importance × lift 로 다시 곱한다.
            #     합의 가산만 얹는다 — 여러 출처가 함께 말한 것을 위로 올린다.
            "importance": round(share * (1 + AGREE_BONUS * (len(c["kinds"]) - 1)), 4),
            "tier": tier, "agreement": len(c["kinds"]),
            "computedAt": today, "configHash": chash,
            "nSynthetic": c["syn"], "shareReal": round(share_real, 4),
        })

    rows.sort(key=lambda r: (r["occupationId"], r["window"], -r["importance"]))
    with (V / "job_skill_stats.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w_ = csv.DictWriter(f, fieldnames=HEAD)
        w_.writeheader()
        w_.writerows(rows)

    allr = [r for r in rows if r["window"] == "all"]
    syn_rows = [r for r in allr if r["nSynthetic"]]
    print(f"범용 도구로 표시해 필수에서 뺀 역량 {len(ubi)}개")
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
