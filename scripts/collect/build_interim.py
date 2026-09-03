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
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data"
OUT = D / "interim"


def run():
    jobs = json.loads((D / "jobs.json").read_text(encoding="utf-8"))
    skills = json.loads((D / "skills.json").read_text(encoding="utf-8"))
    matrix = json.loads((D / "job-skills.json").read_text(encoding="utf-8"))
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
            matrix.append({"jobId": jid, "skillId": sid, "weight": w, "source": "manual"})
            seen.add((jid, sid))
            n_map += 1

    OUT.mkdir(parents=True, exist_ok=True)
    for name, obj in (("jobs.json", jobs), ("skills.json", skills), ("job-skills.json", matrix)):
        (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"직무 {len(jobs)}개 (신입 비율 {n_ratio}개) · 스킬 {len(skills)}개 "
          f"(업무 역량 {len(added)}개 추가) · 매핑 {len(matrix)}건 (수기 {n_map}건)")
    if skipped:
        print(f"  이름이 겹쳐 넣지 않은 업무 역량: {', '.join(skipped)}")
    if dropped_alias:
        print(f"  이미 스킬로 있어 뺀 별칭: {', '.join(dropped_alias)}")
    print(f"→ {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    run()
