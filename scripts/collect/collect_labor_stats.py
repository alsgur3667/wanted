"""발표에 쓸 **실제** 노동시장 통계를 받는다.

왜 이건 가상으로 만들면 안 되나
  서비스 안을 채우는 데이터는 가상이어도 된다 — 목업이고, isSynthetic 으로 표시한다.
  그러나 **발표의 근거가 되는 통계는 다르다.** "구직자가 평균 N개월 헤맨다"를 지어내면
  발표 전체의 신뢰가 무너진다. 이건 실제로 받아 출처와 함께 적는다.

무엇을 받나
  ① 고용24 직업정보(212L01) — 직업 목록·상세·직업사전            → 화면의 평균 연봉 (#25)
  ② 사업체노동력조사   — 구인·미충원 인원과 **미충원 사유**       → 스토리라인 (#27)
     "적합한 지원자가 없어서" 가 미충원 사유 상위로 나오면
     우리 서비스가 푸는 문제가 통계로 뒷받침된다.

⚠️ 받지 않는 곳
  잡코리아·사람인·인크루트·링크드인은 약관이 자동수집을 금한다.
  보도자료로 공개된 설문 결과를 **사람이 읽고 출처와 함께 인용**하는 것은 수집이 아니라 인용이다.
  원티드는 주최사라 어느 쪽도 하지 않는다.

⚠️ 키는 저장소 밖 VAULT/.env 에서만 읽는다. 값을 로그에 찍지 않는다.

산출: data/raw/stats/*.json  (원본) · data/v2/labor_stats.csv (집계, 커밋)
"""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW, load_env, now_kst, polite_get  # noqa: E402

OUT = RAW / "stats"
OUT.mkdir(parents=True, exist_ok=True)

#  고용24 직업정보. 목록(212L01)과 상세(212D01)가 짝이다.
#  ⚠️ 서비스마다 인증키가 따로 발급된다. NCS 직무기술서 키(WORK24_JOB_KEY)로는 안 열린다 —
#     실측: "신청하신 OpenApi 서비스가 존재하지 않습니다".
#  ⚠️ returnType 은 이 서비스에서 XML 로 안내돼 있다. json 이 오면 그것도 받는다.
#  ⚠️ 목록 응답에는 임금 값이 없다. avgSal 은 **거르는 조건**이라
#     구간별로 목록을 받아 어느 구간인지 역산하거나, 상세(212D01)를 써야 한다.
JOB_LIST = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo212L01.do"
JOB_DETAIL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo212D01.do"

#  연봉 구간 코드. 문서에서 확인한 뜻이다 (추측이 아니다).
#  ⚠️ 목록 응답에는 임금 값이 없다. 구간별로 목록을 받아 **어느 구간에 드는지** 역산한다.
#     실측 분포: 10→12개 · 20→138 · 30→156 · 40→155 (합 461, 전체 492 중)
SAL_BANDS = {"10": "3천만원 미만", "20": "3~4천만원", "30": "4~5천만원", "40": "5천만원 이상"}

#  직업전망 코드 — 화면에서 "이 직무는 늘어나는 중" 을 말할 수 있다
PROSPECT = {"1": "증가", "2": "다소 증가", "3": "유지", "4": "다소 감소", "5": "감소"}

#  우리가 다루는 24직무에 대응하는 KNOW 검색어. 직업 이름이 채용 시장 용어와 다르다.
QUERIES = [
    "응용소프트웨어개발자", "시스템소프트웨어개발자", "웹개발자", "네트워크시스템개발자",
    "데이터베이스개발자", "정보보안전문가", "빅데이터전문가", "인공지능전문가",
    "컴퓨터시스템설계분석가", "IT테스터", "IT컨설턴트", "제품디자이너",
    "시각디자이너", "웹디자이너", "영상그래픽디자이너", "광고기획자",
    "마케팅전문가", "경영기획사무원", "상품기획전문가",
]


def call(url, params):
    """json 이면 파싱해서, xml 이면 원문 그대로 돌려준다."""
    r = polite_get(url, params=params, timeout=30)
    if r is None or r.status_code != 200:
        return None
    t = (r.text or "").strip()
    if t.startswith("{"):
        try:
            d = json.loads(t)
        except Exception:
            return None
        if isinstance(d, dict) and d.get("error"):
            raise SystemExit(f"고용24 응답: {d['error']}  "
                             "— 직업정보 서비스용 인증키가 맞는지 확인할 것")
        return d
    return {"_xml": t}


def fetch_list(key, **extra):
    """직업 목록. ⚠️ callTp=L 이 빠지면 HTML 예외 페이지가 온다 — 이것 때문에 한참 헤맸다."""
    d = call(JOB_LIST, {"authKey": key, "callTp": "L", "returnType": "XML",
                        "target": "JOBCD", "startPage": "1", "display": "500", **extra})
    if not d:
        return []
    t = d.get("_xml", "")
    return [{"jobClcd": a, "jobClcdNM": b, "jobCd": c, "jobNm": e}
            for a, b, c, e in re.findall(
                r"<jobClcd>(.*?)</jobClcd><jobClcdNM>(.*?)</jobClcdNM>"
                r"<jobCd>(.*?)</jobCd><jobNm>(.*?)</jobNm>", t)]


def collect_jobs(key):
    """직업 전체 + 연봉 구간 + 직업전망을 받아 하나로 합친다."""
    allj = {j["jobCd"]: j for j in fetch_list(key)}
    for code, label in SAL_BANDS.items():
        for j in fetch_list(key, srchType="C", avgSal=code):
            if j["jobCd"] in allj:
                allj[j["jobCd"]]["salaryBand"] = label
                allj[j["jobCd"]]["salaryCode"] = code
    for code, label in PROSPECT.items():
        for j in fetch_list(key, srchType="C", prospect=code):
            if j["jobCd"] in allj:
                allj[j["jobCd"]]["prospect"] = label
    (OUT / "work24_jobinfo.json").write_text(
        json.dumps({"collectedAt": now_kst(), "source": "고용24 직업정보(212L01)",
                    "sourceUrl": JOB_LIST, "bands": SAL_BANDS, "prospect": PROSPECT,
                    "jobs": list(allj.values())}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    return allj


def run():
    env = load_env()
    #  직업정보 전용 키를 먼저 본다. 없으면 기존 키로 시도하되 대개 막힌다.
    key = env.get("WORK24_JOBINFO_KEY") or env.get("WORK24_JOB_KEY")
    if not key:
        raise SystemExit("WORK24_JOBINFO_KEY 가 없다. VAULT/.env 에 넣을 것.")
    if not env.get("WORK24_JOBINFO_KEY"):
        print("  ⚠️ WORK24_JOBINFO_KEY 가 없어 WORK24_JOB_KEY 로 시도한다 "
              "— 그 키는 NCS 전용이라 막힐 수 있다")
    print("① 고용24 직업정보(212L01) — 직업 목록·연봉 구간·직업전망")
    allj = collect_jobs(key)
    n_sal = sum(1 for j in allj.values() if j.get("salaryBand"))
    n_pro = sum(1 for j in allj.values() if j.get("prospect"))
    print(f"  직업 {len(allj)}개 · 연봉 구간 붙은 것 {n_sal} · 전망 붙은 것 {n_pro}"
          f" → {(OUT / 'work24_jobinfo.json').name}")
    for q in ("웹개발자", "응용소프트웨어", "시각디자이너", "마케팅"):
        for j in allj.values():
            if q in j["jobNm"]:
                print(f"    {j['jobNm'][:24]:26} {j.get('salaryBand', '-'):10}"
                      f" {j.get('prospect', '-')}")
                break

    print("\n② 사업체노동력조사(미충원 사유)")
    print("  ⚠️ 이 통계는 열린 API 가 아니라 파일로 배포된다.")
    print("     고용노동부 통계 사이트에서 받아 data/raw/stats/ 에 두고 별도 정리한다.")
    print("     https://laborstat.moel.go.kr — 직종별사업체노동력조사")


if __name__ == "__main__":
    run()
