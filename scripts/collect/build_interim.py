"""앱이 읽는 data/interim/*.json 을 만든다.

왜 필요한가
  앱(lib/skill-index.ts)은 data/ 가 아니라 **data/interim/** 만 읽는다.
  그런데 interim 을 만드는 스크립트가 없어서 손으로 합쳐져 있었다.
  그러면 공고 데이터를 다시 뽑을 때마다 interim 이 옛 값에 머물고,
  화면은 옛 숫자를 보여주면서 아무 오류도 내지 않는다. 조용히 틀리는 종류다.

무엇을 합치나
  ① data/*.json                 채용공고에서 뽑은 것 (source: JD)
  ② data/work-skills.json       공고 본문이 서술형이라 키워드로 안 잡히는 업무 역량 (source: manual)
                                "요구사항 정의"·"이해관계자 조율" 같은 것. 사람이 직무 정의를 보고 매핑했다.
  ③ data/newcomer-ratio.json    직무별 신입 채용 비율. 신입에게 시니어 직무를 권하지 않기 위한 값.

두 출처를 섞되 구분은 남긴다 — source 필드로 JD 인지 manual 인지 항상 알 수 있다.
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from skill_groups import build as build_groups  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data"
OUT = D / "interim"


def _matrix_from_stats():
    """job_skill_stats.csv(창 all) 를 앱이 읽는 매트릭스 모양으로 바꾼다.

    ⚠️ importance 에 lift 를 곱하지 않는다.
       앱이 imp = importance × min(3, lift) 로 다시 곱한다. 여기서 또 곱하면 lift 가 제곱된다.
       stats 의 importance 칸은 이미 곱한 값이라 쓰지 않고 share 를 쓴다.

    ⚠️ 여기의 tier 는 **공고만 본 판정**이다. 해설 글·공인 체계는 아직 관측으로 안 들어왔다.
       예전 계약은 셋을 합쳐 판정했으므로, 갈아끼우면 그만큼 근거가 줄어든다.
    """
    import csv as _csv
    f = REPO / "data" / "v2" / "job_skill_stats.csv"
    if not f.exists():
        raise SystemExit("job_skill_stats.csv 가 없다. build_stats.py 를 먼저 돌릴 것.")
    TIER = {"필수": "required", "우대": "preferred", "": None}
    out = []
    for r in _csv.DictReader(f.open(encoding="utf-8-sig")):
        if r["window"] != "all":
            continue
        share = float(r["share"])
        out.append({
            "jobId": r["occupationId"], "skillId": r["skillId"],
            "weight": round(share, 4), "docFreq": int(r["nSources"]),
            "reqFreq": int(r["reqCount"]), "prefFreq": int(r["prefCount"]),
            "lift": float(r["lift"]) if r["lift"] else None,
            "importance": round(share, 4), "evidence": round(share, 4),
            "tier": TIER.get(r["tier"], None), "agreement": int(r["agreement"]),
            "source": "observations",
            #  가상이 얼마나 섞였는지 화면까지 들고 간다
            "nCompanies": int(r["nCompanies"]), "nSynthetic": int(r["nSynthetic"]),
            "shareReal": float(r["shareReal"]),
        })
    return out, len(out)


def run():
    jobs = json.loads((D / "jobs.json").read_text(encoding="utf-8"))
    skills = json.loads((D / "skills.json").read_text(encoding="utf-8"))
    matrix = json.loads((D / "job-skills.json").read_text(encoding="utf-8"))
    #  ── 출처 전환 ────────────────────────────────────────────────────
    #  기본은 예전 계약(data/job-skills.json)이다.
    #  SOURCE=v2 면 관측에서 집계한 data/v2/job_skill_stats.csv 를 대신 쓴다.
    #  둘을 바꿔 끼워 채점기로 견주려고 스위치로 뒀다 — 한쪽을 지우면 비교가 안 된다.
    src_mode = os.environ.get("SOURCE", "contract")
    n_v2 = 0
    if src_mode == "v2":
        matrix, n_v2 = _matrix_from_stats()
    work = json.loads((D / "work-skills.json").read_text(encoding="utf-8"))
    ratio = json.loads((D / "newcomer-ratio.json").read_text(encoding="utf-8"))["ratios"]

    job_ids = {j["id"] for j in jobs}
    skill_ids = {s["id"] for s in skills}

    # ① 직무 — 신입 비율을 붙인다
    n_ratio = 0
    for j in jobs:
        if j["id"] in ratio:
            j["newcomerRatio"] = ratio[j["id"]]
            j["ratioSource"] = "manual"
            n_ratio += 1

    #  연봉 구간과 직업전망 — 고용24 직업정보 API 에서 받은 **실제 자료**다.
    #  ⚠️ 목록 API 에 액수가 없어 avgSal 코드로 역산한 구간이다. 액수가 아니라 구간으로 적는다.
    #  ⚠️ 최상단이 "5천만원 이상" 이라 24직무 중 21개가 같은 칸이다. 화면에서 이것만으로는
    #     직무가 구분되지 않는다 — 공고의 제시 연봉과 함께 보여야 한다.
    sal_path = REPO / "data" / "v2" / "occupation_salary.csv"
    n_sal = 0
    if sal_path.exists():
        import csv as _csv
        sal = {r["occupationId"]: r
               for r in _csv.DictReader(sal_path.open(encoding="utf-8-sig"))}
        for j in jobs:
            r = sal.get(j["id"])
            if not r or not r["salaryBand"]:
                continue
            j["salaryBand"] = r["salaryBand"]
            j["salaryLow"] = int(r["salaryLow"]) if r["salaryLow"] else None
            j["salaryHigh"] = int(r["salaryHigh"]) if r["salaryHigh"] else None
            j["prospect"] = r["prospect"]
            j["salarySource"] = "고용24 직업정보"
            n_sal += 1

    # ② 업무 역량 — 이름이 겹치면 넣지 않는다. 같은 뜻이 두 스킬로 갈리면 둘 다 약해진다.
    #
    # 별칭까지 봐야 한다. 이름은 달라도 별칭이 기존 스킬의 이름이면 같은 글자가 두 번 세어진다.
    # 실제로 "실험 설계"가 공고에서 뽑힌 스킬이면서 수기 스킬 "A/B 테스트 설계"의 별칭이었다.
    by_name = {s["name"].lower(): s["id"] for s in skills}
    added, skipped, dropped_alias = [], [], []
    for s in work["skills"]:
        if s["name"].lower() in by_name:
            skipped.append(s["name"])
            continue
        aliases = []
        for a in (s.get("aliases") or []):
            if a.lower() in by_name:
                dropped_alias.append(f"{s['name']}←{a}")
            else:
                aliases.append(a)
        skills.append({**s, "aliases": aliases, "sourceType": "work", "isCertification": False,
                       "onMap": True, "firstStepSource": "manual", "difficultySource": "manual"})
        skill_ids.add(s["id"])
        by_name[s["name"].lower()] = s["id"]
        added.append(s["name"])

    n_map = 0
    seen = {(m["jobId"], m["skillId"]) for m in matrix}
    for jid, rows in work["mapping"].items():
        if jid not in job_ids:
            print(f"  ⚠ mapping 의 직무 '{jid}' 가 jobs 에 없다 — 건너뛴다")
            continue
        for sid, w in rows.items():
            if sid not in skill_ids or (jid, sid) in seen:
                continue
            #  tier 를 반드시 넣는다. 안 넣으면 앱의 '필수' 필터(tier === "required")에서
            #  통째로 빠진다. 실제로 그래서 엔지니어링 리더의 필수가 Ruby·Python·React 가 되고
            #  강도 1위인 '이해관계자 조율'(0.71)이 목록에 못 들었다.
            #  이 표는 사람이 직무 정의를 보고 "이 직무는 이걸 한다"고 적은 것이라 필수로 본다.
            matrix.append({"jobId": jid, "skillId": sid, "weight": w, "source": "manual",
                           "tier": "required", "importance": round(w, 4), "agreement": 1})
            seen.add((jid, sid))
            n_map += 1

    # ④ 직무 간 인접 — 직군을 건너뛰는 경로("이 길도 있어요")의 근거로 쓴다.
    #    개인 점수와 무관하게 "이 두 직무는 요구 역량이 겹친다"는 사실이라,
    #    개인 적합도만으로는 히든 경로가 안 나올 때의 대안이 된다.
    adj = json.loads((D / "job-adjacency.json").read_text(encoding="utf-8"))
    edges = adj["edges"] if isinstance(adj, dict) else adj
    edges = [e for e in edges if e["a"] in job_ids and e["b"] in job_ids]
    n_cross = sum(1 for e in edges if e.get("crossFamily"))

    # ⑤ 택일 관계 묶음 — "이 중 하나만 있으면 된다".
    #    평평한 목록으로 두면 iOS 개발자에게 Kotlin 을 부족 역량으로 요구하게 된다.
    groups = build_groups({s["name"] for s in skills})
    print("택일 묶음 " + " · ".join(f"{g['label']}({len(g['skills'])})" for g in groups.values()))

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "skill-groups.json").write_text(
        json.dumps(groups, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "job-adjacency.json").write_text(
        json.dumps(edges, ensure_ascii=False, indent=1), encoding="utf-8")
    for name, obj in (("jobs.json", jobs), ("skills.json", skills), ("job-skills.json", matrix)):
        (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"인접 {len(edges)}건 (직군 교차 {n_cross}건)")
    if src_mode == "v2":
        print(f"⚠️ 매트릭스를 관측 집계에서 가져왔다 (job_skill_stats {n_v2:,}줄)")
    print(f"직무 {len(jobs)}개 (신입 비율 {n_ratio}개 · 연봉 구간 {n_sal}개) · 스킬 {len(skills)}개 "
          f"(업무 역량 {len(added)}개 추가) · 매핑 {len(matrix)}건 (수기 {n_map}건)")
    if skipped:
        print(f"  이름이 겹쳐 넣지 않은 업무 역량: {', '.join(skipped)}")
    if dropped_alias:
        print(f"  이미 스킬로 있어 뺀 별칭: {', '.join(dropped_alias)}")
    print(f"→ {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    run()
