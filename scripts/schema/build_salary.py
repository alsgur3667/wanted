"""우리 24직무에 **실제** 연봉 구간과 직업전망을 붙인다.

출처
  고용24 직업정보 API(212L01) — 직업 492개. 연봉 구간과 직업전망이 붙는다.
  ⚠️ 목록 응답에는 임금 **액수**가 없다. avgSal 코드로 걸러 어느 구간인지 역산한 것이다.
     코드 뜻은 문서에서 확인했다: 10=3천만원 미만 · 20=3~4천 · 30=4~5천 · 40=5천만원 이상.

⚠️ 왜 액수가 아니라 구간인가
  「한국고용정보원 직업별 임금정보」(data.go.kr 15122500)도 받아 봤지만
  **전체 10건이고 전부 전문자격사**였다 (의사·변호사·회계사…). 개발·기획·디자인이 하나도 없다.
  그래서 화면에는 "평균 연봉 4,000만원" 대신 **"5천만원 이상"** 같은 구간으로 적는다.
  구간이지만 지어낸 값이 아니라 실제 자료다.

⚠️ 매핑은 손으로 했다
  고용24 직업명은 채용 시장 용어와 다르다 (백엔드 개발자 ↔ 응용소프트웨어개발자).
  자동으로 이름을 맞추면 엉뚱한 데 붙는다. 근거를 남기려고 표로 적는다.

산출: data/v2/occupation_salary.csv (커밋 — 실제 자료)
"""
import csv
import json
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
V = REPO / "data" / "v2"
D = REPO / "data" / "interim"

sys.path.insert(0, str(REPO / "scripts" / "collect"))
from collect_common import RAW  # noqa: E402

#  우리 직무 → 고용24 직업명. 여럿이면 가장 가까운 것을 앞에 둔다.
MAP = {
    "sw_eng": ["응용소프트웨어개발자", "시스템 소프트웨어 개발자(프로그래머)"],
    "be_dev": ["응용소프트웨어개발자", "웹개발자(웹 프로그래머)"],
    "fe_dev": ["웹개발자(웹 프로그래머)"],
    "fullstack_dev": ["웹개발자(웹 프로그래머)", "응용소프트웨어개발자"],
    "mobile_dev": ["모바일앱개발자"],
    "embedded_dev": ["시스템 소프트웨어 개발자(프로그래머)"],
    "data_eng": ["데이터 시스템 전문가"],
    "data_scientist": ["데이터분석가(빅데이터분석가)"],
    "data_analyst": ["데이터분석가(빅데이터분석가)", "통계·데이터 관련 사무원"],
    "devops_sre": ["네트워크시스템개발자(네트워크엔지니어)", "IT기술지원전문가"],
    "security_eng": ["정보 보안 전문가"],
    "qa_eng": ["IT테스터 및 IT QA전문가"],
    "architect": ["컴퓨터시스템설계 및 분석가"],
    "eng_lead": ["컴퓨터시스템설계 및 분석가"],          # 개발 조직 리드에 딱 맞는 직업이 없다
    "solutions_eng": ["정보통신컨설턴트 및 감리원", "IT기술지원전문가"],
    "product_manager": ["웹기획자", "상품 기획 전문가"],
    "program_manager": ["상품 기획 전문가"],
    "biz_strategy": ["경영 기획 사무원"],
    "biz_analyst": ["통계·데이터 관련 사무원", "조사전문가"],
    "growth_marketing": ["광고·홍보·마케팅사무원", "광고 및 홍보 전문가"],
    "product_designer": ["UX/UI디자이너"],
    "designer": ["시각 디자이너"],
    "graphic_designer": ["시각 디자이너"],
    "motion_designer": ["영상그래픽디자이너"],
}

#  구간의 대표값 — 가상 공고에 연봉을 뿌릴 때 기준으로 쓴다 (만원)
BAND_RANGE = {
    "3천만원 미만": (2400, 3000),
    "3~4천만원": (3000, 4000),
    "4~5천만원": (4000, 5000),
    "5천만원 이상": (5000, 7000),
}

HEAD = ["occupationId", "displayName", "work24JobNm", "work24JobCd", "salaryBand",
        "salaryLow", "salaryHigh", "prospect", "matchNote", "source", "sourceUrl",
        "collectedAt"]


def run():
    raw = json.loads((RAW / "stats" / "work24_jobinfo.json").read_text(encoding="utf-8"))
    by_name = {j["jobNm"]: j for j in raw["jobs"]}
    jobs = {j["id"]: j for j in json.loads((D / "jobs.json").read_text(encoding="utf-8"))}
    today = date.today().isoformat()

    rows, missing = [], []
    for jid, names in MAP.items():
        #  후보 중 **연봉 구간이 붙은 것**을 먼저 고른다.
        #  이름만 보고 첫 번째를 잡았더니 '통계·데이터 관련 사무원' 처럼
        #  구간이 비어 있는 직업이 걸려 데이터·비즈니스 기획의 연봉이 비었다.
        hit = next((by_name[n] for n in names
                    if n in by_name and by_name[n].get("salaryBand")), None)
        if hit is None:
            hit = next((by_name[n] for n in names if n in by_name), None)
        if hit is None:
            missing.append((jid, names))
            continue
        lo, hi = BAND_RANGE.get(hit.get("salaryBand", ""), ("", ""))
        rows.append({
            "occupationId": jid,
            "displayName": jobs.get(jid, {}).get("title", jid),
            "work24JobNm": hit["jobNm"], "work24JobCd": hit["jobCd"],
            "salaryBand": hit.get("salaryBand", ""), "salaryLow": lo, "salaryHigh": hi,
            "prospect": hit.get("prospect", ""),
            "matchNote": "" if len(names) == 1 else f"후보 {len(names)}개 중 첫 번째",
            "source": "고용24 직업정보 API(212L01)", "sourceUrl": raw["sourceUrl"],
            "collectedAt": today,
        })

    with (V / "occupation_salary.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEAD)
        w.writeheader()
        w.writerows(rows)

    print(f"직무 {len(rows)}개에 연봉 구간·전망을 붙였다"
          + (f" (못 붙인 것 {len(missing)}개)" if missing else ""))
    for m in missing:
        print(f"  ⚠️ 매핑 실패: {m}")
    print()
    for r in sorted(rows, key=lambda x: (x["salaryBand"], x["displayName"])):
        print(f"  {r['displayName'][:15]:17}{r['salaryBand']:12}{r['prospect']:8}"
              f"← {r['work24JobNm'][:26]}")
    print(f"\n→ {(V / 'occupation_salary.csv').relative_to(REPO)}")


if __name__ == "__main__":
    run()
