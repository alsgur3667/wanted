"""고용24 — 직무정보 API · 표준직무기술서 (NCS 능력단위 + 지식·기술·태도).

이 저장소에서 유일한 **한국어 역량 어휘 출처**다.
O*NET·ESCO 는 영문이라, 한국어 이력서에서 뽑은 스킬을 붙일 곳이 필요하다.

제약
  - returnType 은 반드시 소문자('xml'/'json'). 대문자면 HTML 예외 페이지가 온다.
  - 페이징이 없다. 검색어(jobCont) 하나당 능력단위 최대 10건.
    → 눈덩이식으로 넓힌다. 결과의 직무명·지식명을 다시 검색어로 넣는다.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import collect_common as cc  # noqa: E402
from collect_common import polite_get, load_env, RAW, now_kst, sha256  # noqa: E402

cc.MIN_INTERVAL = 0.5
URL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo215L01.do"
OUT = RAW / "ontology" / "work24_ncs"
OUT.mkdir(parents=True, exist_ok=True)
UNITS = OUT / "ability_units.jsonl"

SEEDS = """
소프트웨어 응용프로그램 웹 서버 데이터베이스 네트워크 보안 클라우드 인공지능 빅데이터
머신러닝 데이터분석 시스템 아키텍처 프로그래밍 코딩 테스트 배포 운영 모바일 앱
UI UX 디자인 그래픽 편집 영상 브랜드 제품디자인 시각디자인 웹디자인 인터랙션
기획 서비스기획 사업기획 상품기획 마케팅 전략 프로젝트관리 프로세스 요구사항
품질관리 성과관리 고객관리 콘텐츠 커뮤니케이션 문서작성 통계 시각화
""".split()

MAX_QUERIES = 1200
STOP = re.compile(r"^(및|등|관련|기타|이해|능력|지식|기술|태도)$")

# ⭐ 수집 범위는 개발·기획·디자인 세 직군뿐이다 (2026-09-01 지시).
#    NCS 대분류가 그대로 대응한다. 구분자(·/.)는 무시하고 비교한다.
IN_SCOPE = {
    "정보통신": "개발",
    "문화예술디자인방송": "디자인",
    "사업관리": "기획",
    "경영회계사무": "기획",     # 기획사무·마케팅이 여기 있다. 아래 중분류로 한 번 더 거른다.
}
PLAN_MID = ("기획", "마케팅", "광고", "홍보", "상품", "전략")


def norm(s_):
    return re.sub(r"[^가-힣A-Za-z0-9]", "", s_ or "")


def scope_of(unit):
    """범위 안이면 직군명, 밖이면 None."""
    fam = IN_SCOPE.get(norm(unit.get("job_lcfn")))
    if fam is None:
        return None
    if norm(unit.get("job_lcfn")) == "경영회계사무":
        mid = unit.get("job_mcn") or ""
        if not any(h in mid for h in PLAN_MID):
            return None
    return fam


def search(word):
    r = polite_get(URL, params={"authKey": load_env()["WORK24_JOB_KEY"],
                                "returnType": "json", "jobCont": word}, timeout=30)
    if r.status_code != 200:
        return {}
    try:
        return r.json().get("result", {}) or {}
    except ValueError:
        return {}


def terms_from(unit: dict):
    """다음 검색어 후보를 뽑는다 — 직무·소분류명과 지식·기술·태도 라벨."""
    out = set()
    for k in ("job_sdvn", "job_scfn", "job_mcn"):
        v = unit.get(k)
        if isinstance(v, str) and 1 < len(v) <= 20:
            out.add(v)
    for it in unit.get("knwg_tchn_attd") or []:
        lab = (it or {}).get("knwg_tchn_attd_label", "")
        for tok in re.split(r"[\s·,/()]+", lab):
            tok = tok.strip()
            if 2 <= len(tok) <= 12 and not STOP.match(tok):
                out.add(tok)
    return out


def run():
    done_units = {}
    if UNITS.exists():
        for l in UNITS.read_text(encoding="utf-8").splitlines():
            if l.strip():
                u = json.loads(l)
                done_units[u["ablt_unit"]] = True

    queue = list(SEEDS)
    asked, skills, out_of_scope = set(), set(), set()
    f = UNITS.open("a", encoding="utf-8")

    while queue and len(asked) < MAX_QUERIES:
        w = queue.pop(0)
        if w in asked:
            continue
        asked.add(w)
        res = search(w)
        new = 0
        for name, unit in res.items():
            code = unit.get("ablt_unit")
            if not code or code in done_units:
                continue
            fam = scope_of(unit)
            if fam is None:            # 범위 밖 직군은 저장도, 확장도 하지 않는다
                out_of_scope.add(code)
                continue
            done_units[code] = True
            new += 1
            rec = {
                "ablt_unit": code,
                "name": name,
                "definition": unit.get("ablt_def"),
                "대분류": unit.get("job_lcfn"),
                "중분류": unit.get("job_mcn"),
                "소분류": unit.get("job_scfn"),
                "직무": unit.get("job_sdvn"),
                "job_family": fam,
                "knowledge_skills": [
                    (i or {}).get("knwg_tchn_attd_label")
                    for i in (unit.get("knwg_tchn_attd") or [])
                    if (i or {}).get("knwg_tchn_attd_label")
                ],
                "_query": w,
            }
            skills.update(rec["knowledge_skills"])
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            for t in terms_from(unit):
                if t not in asked:
                    queue.append(t)
        if len(asked) % 50 == 0:
            f.flush()
            print(f"  질의 {len(asked):,}/{MAX_QUERIES} · 능력단위 {len(done_units):,} · "
                  f"지식기술 {len(skills):,} · 범위밖제외 {len(out_of_scope):,} · "
                  f"대기 {len(queue):,}", flush=True)

    f.close()
    print(f"\n완료 — 질의 {len(asked):,}회 · 능력단위 {len(done_units):,}개 · "
          f"고유 지식·기술·태도 {len(skills):,}개")

    rec = {"id": "onto_00004", "source": "work24:표준직무기술서", "source_url": URL,
           "collected_at": now_kst(), "posted_at": None, "expires_at": None,
           "job_family": None, "license": "이용허락범위 제한없음 (공공데이터포털 15088876)",
           "http_status": 200, "sha256": sha256(str(len(done_units))),
           "raw_path": "ontology/work24_ncs/ability_units.jsonl"}
    with (RAW / "_manifest.jsonl").open("a", encoding="utf-8") as mf:
        mf.write(json.dumps(rec, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    run()
