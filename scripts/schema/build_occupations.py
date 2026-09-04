"""occupations · occupation_relations 를 채운다.

무엇을 하나
  지금 24직무에 **공인 분류를 앵커로 달고**, 직무끼리의 포함·인접 관계를 계산한다.
  공인 분류는 라벨이 아니다 — 사용자에게 "Software Developers 를 추천합니다"라고
  말할 수는 없다(실측: 15-1252.00 하나에 소프트웨어 엔지니어·백엔드·풀스택·모바일이 붙는다).
  대신 **정의와 겹침의 근거**로 쓴다.

방향은 흡수율만으로 정할 수 없다
  처음엔 "A 의 필수가 B 에 흡수되면 B 가 상위" 로 잡았다. 그랬더니
  «그래픽 디자이너 ⊃ 디자이너(일반)» 과 그 반대가 **동시에** 나왔다.
  서로 흡수하는 것은 상하위가 아니라 **거의 같은 직무**다.

  그래서 셋으로 가른다.
    포함      한쪽만 흡수된다 (비대칭) + 공인 코드를 나눠 쓴다
    합치기후보 서로 흡수한다 (대칭)      → 직무 정의가 겹친다는 뜻 (이슈 #13)
    인접      요구가 비슷하다 (자카드)

isRecommendable 은 여기서 정하지 않는다
  '추천에서 빼자'는 최종 판단은 사람이 한다. 여기서는 **후보와 근거만** 낸다.
  판단은 data/v2/overrides.csv 에 이유와 함께 남긴다 — 그것이 스키마의 설계다.

  후보를 가리는 두 가지 (성격이 다르다)
    범용형  필수 역량의 변별력이 낮다 = 아무 데서나 요구하는 것들로 이뤄졌다
            실측: 소프트웨어 엔지니어 1.10 · 솔루션 엔지니어 1.12 · 아키텍트 1.40
                 그다음이 데이터 사이언티스트 3.95 로 뚝 떨어진다
    포함형  변별력은 높지만 남에게 통째로 흡수되고 공인 코드도 나눠 쓴다
            실측: 디자이너(일반) — 프로덕트 디자이너에 1.00 흡수

  ⚠️ 변별력은 lift 가 있는 줄로만 잰다. 수기 업무 역량은 lift 가 없어 1.0 으로 잡히는데,
     그대로 세면 프로덕트 매니저가 '가장 범용한 직무'로 나온다. 착시다.

산출
  data/v2/occupations.csv           커밋한다 (사람이 손보는 표)
  data/v2/occupation_relations.csv  커밋한다 (파생이지만 작고 눈으로 볼 값)
"""
import csv
import json
import math
from datetime import date
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data" / "interim"
OUT = REPO / "data" / "v2"

sys.path.insert(0, str(REPO / "scripts" / "collect"))
from build_ontology_reqs import NCS, ONET  # noqa: E402

LIFT_CAP, MUST_REL, MUST_MAX, NICE_MAX = 3.0, 0.4, 8, 6
SHARED_MIN = 2          # 공인 코드를 나눠 쓰는 다른 직무 수
CONTAIN_MIN = 0.7       # 자기 필수가 남에게 흡수되는 비율
ADJ_MIN = 0.25          # 이 미만이면 인접이라 부르지 않는다
GENERIC_MAX = 1.5       # 변별력이 이 아래면 범용형 후보
MIN_MEASURABLE = 3      # lift 있는 필수가 이보다 적으면 변별력을 재지 않는다

#  한 줄 정의. 화면에 그대로 나가므로 채용 시장에서 쓰는 말로 적는다.
SUMMARY = {
    "sw_eng": "특정 분야로 갈리기 전의 일반 개발 직무. 하위 직무의 상위 개념이다.",
    "be_dev": "서버·API·데이터 저장을 맡아 서비스의 뒤쪽을 만든다.",
    "fe_dev": "사용자가 직접 만지는 화면을 만들고 브라우저에서 동작하게 한다.",
    "fullstack_dev": "화면과 서버를 함께 맡는다. 작은 조직에서 한 사람이 양쪽을 본다.",
    "mobile_dev": "iOS·안드로이드 앱을 만든다. 플랫폼에 따라 쓰는 언어가 갈린다.",
    "embedded_dev": "기기 안에서 도는 소프트웨어를 만든다. 자원이 제한된 환경을 다룬다.",
    "data_eng": "데이터가 흐르는 길을 만든다. 수집·적재·가공 파이프라인을 맡는다.",
    "data_scientist": "데이터로 모델을 만들어 예측하거나 자동화한다.",
    "data_analyst": "데이터를 읽어 무슨 일이 일어났는지 설명하고 지표를 만든다.",
    "devops_sre": "배포와 운영을 자동화하고 서비스가 죽지 않게 한다.",
    "security_eng": "취약점을 찾아 막고 침해에 대응한다.",
    "qa_eng": "제품이 요구대로 동작하는지 검증하고 그 과정을 자동화한다.",
    "architect": "시스템 전체의 구조를 정하고 기술 선택의 기준을 세운다.",
    "eng_lead": "개발 조직을 이끈다. 사람과 일정과 기술 방향을 함께 본다.",
    "solutions_eng": "고객 환경에 제품을 맞춰 넣는다. 기술과 영업 사이에 선다.",
    "product_manager": "무엇을 왜 만들지 정하고 그 결정을 팀에 맞춘다.",
    "program_manager": "여러 팀에 걸친 일정과 위험을 관리해 끝까지 굴러가게 한다.",
    "biz_strategy": "사업 방향과 우선순위를 숫자로 세운다.",
    "biz_analyst": "사업 질문을 데이터로 바꿔 답하고 의사결정을 돕는다.",
    "growth_marketing": "유입부터 전환까지를 실험으로 개선한다.",
    "product_designer": "사용자가 겪는 흐름을 설계하고 화면으로 옮긴다.",
    "designer": "시각과 사용성을 두루 맡는 일반 디자인 직무.",
    "graphic_designer": "브랜드와 인쇄·화면 그래픽을 만든다.",
    "motion_designer": "움직이는 그래픽과 영상을 만든다.",
}
LEVEL = {"eng_lead": "리드", "architect": "리드"}


def requirements(rows):
    """앱과 같은 규칙으로 필수·우대를 고른다."""
    def imp(m):
        return (m.get("importance") or m.get("evidence") or m["weight"]) * min(
            LIFT_CAP, m.get("lift") or 1)
    ordered = sorted(rows, key=lambda m: -imp(m))
    if not ordered:
        return set(), set()
    top = imp(ordered[0]) or 1
    must = [m for m in ordered
            if m.get("tier") == "required" and (m.get("pinned") or imp(m) >= top * MUST_REL)]
    if len(must) < 3:
        must = ordered[:3]
    must = must[:MUST_MAX]
    ms = {m["skillId"] for m in must}
    nice = [m for m in ordered
            if m["skillId"] not in ms and (m.get("tier") == "preferred" or imp(m) >= top * 0.2)]
    return ms, {m["skillId"] for m in nice[:NICE_MAX]}


def run():
    jobs = json.loads((D / "jobs.json").read_text(encoding="utf-8"))
    matrix = json.loads((D / "job-skills.json").read_text(encoding="utf-8"))
    per = {}
    for m in matrix:
        per.setdefault(m["jobId"], []).append(m)

    req = {j["id"]: requirements(per.get(j["id"], [])) for j in jobs}
    today = date.today().isoformat()

    #  공인 코드를 몇 개의 직무가 나눠 쓰나
    shared = {}
    for table, tag in ((ONET, "onet"), (NCS, "ncs")):
        for jid, codes in table.items():
            for c in codes:
                shared.setdefault(f"{tag}:{c}", []).append(jid)

    def codes_of(jid):
        return ([f"onet:{c}" for c in ONET.get(jid, [])]
                + [f"ncs:{c}" for c in NCS.get(jid, [])])

    # ── 그 직무다움 ──────────────────────────────────────────────────
    #  필수 역량의 변별력(lift) 기하평균. 낮으면 아무 데서나 요구하는 것들로 이뤄진 직무다.
    #  ⚠️ lift 가 있는 줄로만 잰다. 수기 업무 역량은 lift 가 없어 1.0 으로 잡히는데
    #     그대로 세면 프로덕트 매니저가 '가장 범용한 직무'가 된다.
    def imp(m):
        return (m.get("importance") or m.get("evidence") or m["weight"]) * min(
            LIFT_CAP, m.get("lift") or 1)

    distinct = {}
    for j in jobs:
        rows = sorted(per.get(j["id"], []), key=lambda m: -imp(m))
        ms = req[j["id"]][0]
        real = [m for m in rows
                if m["skillId"] in ms and m.get("lift") and m.get("source") != "manual"]
        distinct[j["id"]] = (math.exp(sum(math.log(max(0.05, m["lift"])) for m in real)
                                      / len(real))
                             if len(real) >= MIN_MEASURABLE else None)

    # ── 관계 ─────────────────────────────────────────────────────────
    absorb = {}          # (a,b) = a 의 필수가 b 의 요구에 흡수되는 비율
    for a_ in jobs:
        ma, _ = req[a_["id"]]
        for b_ in jobs:
            if a_["id"] == b_["id"] or not ma:
                continue
            mb, nb = req[b_["id"]]
            absorb[(a_["id"], b_["id"])] = len(ma & (mb | nb)) / len(ma)

    rel = []
    for a_ in jobs:
        ma, na = req[a_["id"]]
        if not ma:
            continue
        for b_ in jobs:
            if a_["id"] == b_["id"]:
                continue
            ab = absorb[(a_["id"], b_["id"])]
            ba = absorb.get((b_["id"], a_["id"]), 0)
            basis = [c for c in codes_of(a_["id"]) if c in codes_of(b_["id"])]
            #  한쪽만 흡수될 때만 상하위로 본다. 서로 흡수하면 거의 같은 직무다.
            if ab >= CONTAIN_MIN and ba < CONTAIN_MIN and basis:
                rel.append(dict(fromId=b_["id"], toId=a_["id"], type="포함",
                                strength=round(ab, 2),
                                basis="|".join(basis + [f"absorb:{ab:.2f}",
                                                        f"reverse:{ba:.2f}"]),
                                computedAt=today))
        for b_ in jobs:
            if a_["id"] >= b_["id"]:        # 인접·합치기후보는 방향이 없다. 한 줄만 둔다
                continue
            mb, nb = req[b_["id"]]
            ua, ub = ma | na, mb | nb
            jac = len(ua & ub) / len(ua | ub) if (ua | ub) else 0
            ab, ba = absorb[(a_["id"], b_["id"])], absorb[(b_["id"], a_["id"])]
            if ab >= CONTAIN_MIN and ba >= CONTAIN_MIN:
                #  서로 흡수 = 직무 정의가 겹친다. 합칠지 사람이 정한다 (이슈 #13)
                rel.append(dict(fromId=a_["id"], toId=b_["id"], type="인접",
                                strength=round(max(ab, ba), 2),
                                basis=f"합치기후보|absorb:{ab:.2f}|reverse:{ba:.2f}"
                                      f"|reqJaccard:{jac:.2f}", computedAt=today))
            elif jac >= ADJ_MIN:
                rel.append(dict(fromId=a_["id"], toId=b_["id"], type="인접",
                                strength=round(jac, 2), basis=f"reqJaccard:{jac:.2f}",
                                computedAt=today))

    best = {}
    for r in rel:
        k = (r["fromId"], r["toId"], r["type"])
        if k not in best or r["strength"] > best[k]["strength"]:
            best[k] = r
    rel = sorted(best.values(), key=lambda r: (r["type"], -r["strength"]))

    # ── 직무 ─────────────────────────────────────────────────────────
    #  isRecommendable 은 여기서 정하지 않는다. 전부 true 로 두고 **후보만** 알린다.
    #  판단은 data/v2/overrides.csv 에 이유와 함께 남긴다.
    occ, cand = [], []
    for j in jobs:
        jid = j["id"]
        n_shared = max((len([x for x in shared[c] if x != jid]) for c in codes_of(jid)),
                       default=0)
        cov, by = max(((v, b) for (a_, b), v in absorb.items() if a_ == jid),
                      default=(0.0, ""))
        g = distinct[jid]
        why = []
        if g is not None and g <= GENERIC_MAX:
            why.append(f"범용형(변별력 {g:.2f})")
        if cov >= CONTAIN_MIN and n_shared >= SHARED_MIN and absorb.get((by, jid), 0) < CONTAIN_MIN:
            why.append(f"포함형({cov:.2f} 흡수 → {by})")
        if why:
            cand.append((jid, j["title"], why, n_shared, g, cov, by))
        occ.append(dict(
            id=jid, displayName=j["title"], aliases="|".join(j.get("aliases") or []),
            family=j["family"], summary=SUMMARY.get(jid, ""),
            definitionRefs="", onetRefs="|".join(ONET.get(jid, [])),
            ncsRefs="|".join(NCS.get(jid, [])), isRecommendable="true",
            level=LEVEL.get(jid, "실무"), status="active", mergedInto="",
            updatedAt=today))

    OUT.mkdir(parents=True, exist_ok=True)
    head_o = ["id", "displayName", "aliases", "family", "summary", "definitionRefs",
              "onetRefs", "ncsRefs", "isRecommendable", "level", "status",
              "mergedInto", "updatedAt"]
    with (OUT / "occupations.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=head_o)
        w.writeheader()
        for o in occ:
            w.writerow({k: o[k] for k in head_o})
    head_r = ["fromId", "toId", "type", "strength", "basis", "computedAt"]
    with (OUT / "occupation_relations.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=head_r)
        w.writeheader()
        w.writerows(rel)

    title = {o["id"]: o["displayName"] for o in occ}
    print(f"직무 {len(occ)}개 · 관계 {len(rel)}건 "
          f"(포함 {sum(1 for r in rel if r['type'] == '포함')} · "
          f"인접 {sum(1 for r in rel if r['type'] == '인접')})")

    print()
    print("추천에서 뺄지 볼 후보 — 판단은 overrides 에 남긴다")
    for jid, t, why, ns, g, cov, by in sorted(cand, key=lambda x: (x[4] or 99)):
        print(f"    {t[:16]:18} 코드공유 {ns} · {' · '.join(why)}")

    merge = [r for r in rel if "합치기후보" in r["basis"]]
    print()
    print(f"직무 정의가 겹쳐 합칠지 볼 짝 {len(merge)}건 (이슈 #13)")
    for r in merge:
        print(f"    {title[r['fromId']][:14]:16} ↔ {title[r['toId']][:14]:16} {r['basis']}")

    print()
    print(f"포함 관계")
    for r in [x for x in rel if x["type"] == "포함"]:
        print(f"    {title[r['fromId']][:14]:16} ⊃ {title[r['toId']][:14]:16}"
              f" {r['strength']}  {r['basis']}")
    print()
    print(f"→ {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    run()
