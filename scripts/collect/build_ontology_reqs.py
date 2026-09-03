"""공인 직업 분석 체계를 요구 역량의 세 번째 근거로 쓴다.

왜
  지금까지 요구 역량은 채용공고(JD)와 직무 해설 글 두 가지에서만 나왔다.
  그런데 **직업을 분석해 놓은 공인 자료가 이미 있고, 우리가 이미 받아 두었다.**
  받아만 두고 스킬 사전을 거르는 데만 썼지 "이 직무는 무엇을 요구하는가"에는 안 썼다.

  회사마다 공고에 적는 것이 다르다. 어느 회사도 안 적었다고 그 역량이 필요 없는 것은 아니다.
  O*NET 은 미국 노동부가 직업별로 쓰는 소프트웨어를 조사해 둔 것이고,
  NCS 는 고용노동부의 국가직무능력표준이다. 둘 다 개인 의견이 아니다.

무게
  그래도 공고와 같지는 않다. 미국 조사이고(O*NET), 갱신 주기가 길다.
  export_contract 에서 해설 글과 함께 할인해 더한다.

라이선스
  O*NET 31.0  CC BY 4.0 — 출처 표시하면 상업적 이용 가능
  NCS         공공데이터포털 15088876, 이용허락범위 제한없음
  ESCO        EUPL — 지금은 쓰지 않는다. 역량이 영어 서술문("assist forest visitors")이라
              우리 사전의 짧은 명사와 맞출 수가 없다. 억지로 맞추면 오탐만 는다.

산출: data/raw/_ontology_reqs.json
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW, word_pattern  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
ONTO = RAW / "ontology"
OUT = RAW / "_ontology_reqs.json"

# ── 우리 직무 → O*NET 직업 ────────────────────────────────────────────
#  손으로 맞췄다. 제목만 보고 기계적으로 붙이면 엉뚱한 것이 붙는다
#  (예: "Computer Programmers" 를 프론트엔드에 붙이면 웹과 무관한 도구가 딸려온다).
ONET = {
    "sw_eng":           ["15-1252.00"],                           # Software Developers
    "be_dev":           ["15-1252.00", "15-1299.08"],             # + Systems Engineers/Architects
    "fe_dev":           ["15-1254.00", "15-1255.00"],             # Web Developers, Web/Digital Interface Designers
    "fullstack_dev":    ["15-1254.00", "15-1252.00"],
    "mobile_dev":       ["15-1252.00"],                           # O*NET 에 모바일 전용 직업이 없다
    "embedded_dev":     ["15-1251.00"],                           # Computer Programmers
    "data_eng":         ["15-1243.00", "15-1243.01", "15-1242.00"],  # Database Architects·DW·DBA
    "data_scientist":   ["15-2051.00", "15-1221.00"],             # Data Scientists, CS Research Scientists
    "data_analyst":     ["15-2051.01", "15-2031.00"],             # BI Analysts, Operations Research Analysts
    "devops_sre":       ["15-1244.00", "15-1241.00"],             # SysAdmins, Network Architects
    "security_eng":     ["15-1212.00", "15-1299.05", "15-1299.04"],  # InfoSec Analysts·Engineers·PenTesters
    "qa_eng":           ["15-1253.00"],                           # SQA Analysts and Testers
    "architect":        ["15-1299.08", "15-1241.00"],             # Systems Engineers/Architects
    "eng_lead":         ["11-3021.00"],                           # Computer and Information Systems Managers
    "solutions_eng":    ["15-1211.00", "15-1232.00"],             # Systems Analysts, User Support
    "program_manager":  ["13-1082.00", "15-1299.09"],             # Project Mgmt Specialists, IT PM
    "product_manager":  ["15-1299.09", "13-1082.00"],
    "biz_strategy":     ["13-1111.00"],                           # Management Analysts
    "biz_analyst":      ["15-2051.01", "13-1111.00"],
    "growth_marketing": ["13-1161.00", "13-1161.01", "11-2021.00"],  # Market Research·Search Marketing·Marketing Mgr
    "product_designer": ["15-1255.00"],                           # Web and Digital Interface Designers
    "designer":         ["15-1255.00", "27-1024.00"],
    "graphic_designer": ["27-1024.00", "27-1011.00"],             # Graphic Designers, Art Directors
    "motion_designer":  ["27-1014.00"],                           # Special Effects Artists and Animators
}

# ── 우리 직무 → NCS 직무 ──────────────────────────────────────────────
#  NCS 는 지식 서술이 "…에 대한 지식" 형태로 길다. 짧은 도구명은 그 안에 섞여 있다.
NCS = {
    "sw_eng":           ["응용SW엔지니어링"],
    "be_dev":           ["응용SW엔지니어링", "SW아키텍처"],
    "fe_dev":           ["UI/UX개발", "응용SW엔지니어링"],
    "mobile_dev":       ["스마트문화앱콘텐츠제작", "응용SW엔지니어링"],
    "embedded_dev":     ["임베디드SW엔지니어링"],
    "data_eng":         ["빅데이터플랫폼구축", "빅데이터운영·관리"],
    "data_scientist":   ["빅데이터분석"],
    "data_analyst":     ["빅데이터분석", "통계조사"],
    "devops_sre":       ["IT시스템관리", "클라우드인프라스트럭쳐엔지니어링", "정보시스템운영"],
    "security_eng":     ["보안엔지니어링", "정보보호관리·운영", "보안사고분석대응"],
    "architect":        ["SW아키텍처", "인프라스트럭쳐아키텍처구축", "클라우드솔루션아키텍처"],
    "program_manager":  ["IT프로젝트관리"],
    "product_manager":  ["IT프로젝트관리", "정보기술전략"],
    "biz_strategy":     ["정보기술전략", "정보기술컨설팅"],
    "product_designer": ["UI/UX개발", "디지털디자인"],
    "designer":         ["디지털디자인", "시각디자인"],
    "graphic_designer": ["시각디자인"],
    "motion_designer":  ["VR콘텐츠디자인", "무대영상"],
}


# O*NET 은 벤더명을 앞에 붙여 적는다 — "Oracle Java" · "Microsoft SQL Server" · "Adobe Photoshop".
# 그대로 낱말 매칭하면 Oracle 이 Java 항목까지 먹어 1위가 된다(실측: be_dev 에서 44회).
# 벤더 접두사를 떼고 나서 맞춘다.
VENDOR = re.compile(r"^(Oracle|Microsoft|Adobe|IBM|Apache|Google|Amazon|Apple|SAP|Salesforce|Atlassian)\s+")


def strip_vendor(name: str) -> str:
    prev = None
    while prev != name:
        prev, name = name, VENDOR.sub("", name)
    return name


def load_patterns():
    skills = json.loads((REPO / "data" / "interim" / "skills.json").read_text(encoding="utf-8"))
    pats = []
    for s in skills:
        for t in [s["name"]] + list(s.get("aliases") or []):
            if len(t) >= 2:
                pats.append((word_pattern(t), s["id"]))
    return pats


def run():
    pats = load_patterns()

    # O*NET — 직업별 소프트웨어. 표기가 장황해서(Structured query language SQL)
    # 통째로 비교하면 12% 만 맞는다. 낱말 단위로 보면 30% 다.
    soft = defaultdict(list)
    with (ONTO / "onet_31_0" / "Software Skills.txt").open(encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            soft[r["O*NET-SOC Code"]].append((r["Workplace Example"], r["Hot Technology"] == "Y"))

    ncs = defaultdict(list)
    with (ONTO / "work24_ncs" / "ability_units.jsonl").open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                d = json.loads(line)
                ncs[d["직무"]].extend(d.get("knowledge_skills") or [])

    # 항목 수가 아니라 **직업 수**를 센다.
    #   Oracle 제품이 20개 실려 있다고 그 직업이 Oracle 을 20배 요구하는 것이 아니다.
    #   "이 직무에 대응하는 직업 N개 중 몇 개가 이 역량을 쓰는가"가 우리가 알고 싶은 것이다.
    out = defaultdict(lambda: defaultdict(lambda: {"onet": 0, "onetOf": 0, "onetHot": False,
                                                   "ncs": 0, "ncsOf": 0}))
    for jid, codes in ONET.items():
        for code in codes:
            per_code = defaultdict(bool)
            hot_of = defaultdict(bool)
            for nm, hot in soft.get(code, []):
                base = strip_vendor(nm)
                for p, sid in pats:
                    if p.search(base):
                        per_code[sid] = True
                        hot_of[sid] = hot_of[sid] or hot
            for sid in per_code:
                out[jid][sid]["onet"] += 1
                out[jid][sid]["onetHot"] = out[jid][sid]["onetHot"] or hot_of[sid]
        for sid in out[jid]:
            out[jid][sid]["onetOf"] = len(codes)

    for jid, jobs in NCS.items():
        units = [(job, ph) for job in jobs for ph in ncs.get(job, [])]
        n_units = len(units) or 1
        seen = defaultdict(int)
        for _, phrase in units:
            for p, sid in pats:
                if p.search(phrase):
                    seen[sid] += 1
        for sid, c in seen.items():
            out[jid][sid]["ncs"] = c
            out[jid][sid]["ncsOf"] = n_units

    # ── 변별력 ────────────────────────────────────────────────────────
    #  O*NET 의 직업별 소프트웨어 목록은 넓다. 그 직업 사람이 만질 수 있는 것을 다 싣는다.
    #  그래서 Photoshop·Excel 같은 것이 어느 직업에나 나오고, 그대로 쓰면
    #  Software Developers 의 1순위가 Photoshop 이 된다(실측).
    #  전체 직업 대비 얼마나 유난한지(lift)를 재서 걸러야 한다.
    all_codes = {c for cs in ONET.values() for c in cs}
    base = defaultdict(int)
    for code in all_codes:
        seen_c = set()
        for nm, _ in soft.get(code, []):
            b = strip_vendor(nm)
            for p, sid in pats:
                if p.search(b):
                    seen_c.add(sid)
        for sid in seen_c:
            base[sid] += 1
    n_all = len(all_codes) or 1

    MIN_LIFT = 1.3
    kept = 0
    for jid, d in out.items():
        for sid, v in list(d.items()):
            share = v["onet"] / max(1, v["onetOf"])
            b = base.get(sid, 0) / n_all
            v["onetLift"] = round(share / b, 2) if b else None
            #  변별력이 낮으면 O*NET 근거를 버린다. NCS 근거는 그대로 둔다 —
            #  NCS 는 한국 직무 기준이고 서술이 구체적이라 성격이 다르다.
            if v["onetLift"] is not None and v["onetLift"] < MIN_LIFT:
                v["onet"] = 0
            elif v["onet"]:
                kept += 1
        out[jid] = {sid: v for sid, v in d.items() if v["onet"] or v["ncs"]}
    print(f"변별력 {MIN_LIFT} 이상만 남김 — O*NET 근거 {kept:,}쌍")

    res = {j: {s: v for s, v in d.items()} for j, d in out.items()}
    OUT.write_text(json.dumps({
        "note": "공인 직업 분석 체계에서 뽑은 직무별 요구 역량 근거. 개인 의견이 아니다.",
        "sources": {"onet": "O*NET 31.0 (CC BY 4.0, U.S. DOL)",
                    "ncs": "국가직무능력표준 표준직무기술서 (공공데이터포털 15088876)"},
        "mapping_note": "직무 대응은 손으로 맞췄다. 근거는 이 파일을 만든 스크립트 주석에 있다.",
        "jobs": res,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    n_pair = sum(len(v) for v in res.values())
    print(f"공인 체계 근거 — 직무 {len(res)}개 · (직무,역량) {n_pair:,}쌍")
    for jid in ("sw_eng", "fe_dev", "data_scientist", "graphic_designer", "security_eng"):
        top = sorted(res.get(jid, {}).items(), key=lambda x: -(x[1].get("onetLift") or 0))[:7]
        print(f"   {jid:16} " + " · ".join(
            f"{s}(lift {v.get('onetLift')}{'·hot' if v['onetHot'] else ''})" for s, v in top))
    print(f"→ {OUT.relative_to(RAW)}")


if __name__ == "__main__":
    run()
