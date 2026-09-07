"""앱 시연용 가상 회사·채용공고를 재현 가능하게 만든다.

실제 채용 서비스에서는 회사와 공고 원문을 정식 공급원에서 받아 같은 계약으로
교체한다. 지금은 화면과 사용자 흐름을 검증하는 목업이므로 실제 회사명·URL·로고를
사용하지 않으며, 모든 레코드에 isSynthetic과 생성 근거를 남긴다.
"""

from __future__ import annotations

import json
import random
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data"
SNAPSHOT = date(2026, 9, 7)
GENERATED_AT = f"{SNAPSHOT.isoformat()}T00:00:00+09:00"
SEED = 20260907
SYNTHESIS_BASIS = "public-field-patterns+internal-job-matrix:v1"


# 이름·소개는 모두 이 저장소에서 만든 가상 값이다. 실제 로고나 도메인은 만들지 않는다.
COMPANY_SPECS = [
    dict(id="lumenflow", name="루멘플로우", initials="LF", industry="B2B SaaS", stage="growth", employees="51~100명", founded=2020, hq="서울 성동구", modes=["hybrid", "remote"], tagline="팀의 의사결정을 한 흐름으로 연결합니다", product="업무 데이터와 협업 기록을 연결하는 의사결정 SaaS", tags=["SaaS", "협업", "데이터"], colors=["#F59E0B", "#EA580C"], jobs=["product_manager", "fe_dev", "be_dev"]),
    dict(id="pebblepay", name="페블페이", initials="PP", industry="핀테크", stage="growth", employees="101~300명", founded=2018, hq="서울 영등포구", modes=["hybrid", "onsite"], tagline="작은 사업자의 금융 업무를 가볍게 만듭니다", product="소상공인 정산·현금흐름 관리 서비스", tags=["핀테크", "결제", "보안"], colors=["#14B8A6", "#0F766E"], jobs=["mobile_dev", "security_eng", "data_analyst"]),
    dict(id="mosaicmarket", name="모자이크마켓", initials="MM", industry="커머스", stage="stable", employees="301~500명", founded=2015, hq="서울 강남구", modes=["hybrid", "onsite"], tagline="취향이 다른 고객과 브랜드를 연결합니다", product="개인화 상품 탐색과 브랜드 운영 플랫폼", tags=["커머스", "추천", "브랜드"], colors=["#EC4899", "#BE185D"], jobs=["growth_marketing", "product_designer", "data_eng"]),
    dict(id="cloudforge", name="클라우드포지", initials="CF", industry="클라우드", stage="stable", employees="101~300명", founded=2017, hq="경기 성남시", modes=["hybrid", "remote"], tagline="서비스 운영의 복잡함을 자동화합니다", product="멀티 클라우드 운영·관측 자동화 플랫폼", tags=["클라우드", "DevOps", "관측성"], colors=["#3B82F6", "#1D4ED8"], jobs=["devops_sre", "architect", "solutions_eng"]),
    dict(id="nestcare", name="네스트케어", initials="NC", industry="디지털 헬스케어", stage="growth", employees="51~100명", founded=2021, hq="서울 송파구", modes=["hybrid", "onsite"], tagline="돌봄 과정의 빈틈을 데이터로 줄입니다", product="병원·보호자용 돌봄 일정 및 기록 서비스", tags=["헬스케어", "B2B", "개인정보"], colors=["#22C55E", "#15803D"], jobs=["sw_eng", "program_manager", "qa_eng"]),
    dict(id="mobiwave", name="모비웨이브", initials="MW", industry="모빌리티", stage="growth", employees="101~300명", founded=2019, hq="경기 성남시", modes=["hybrid", "onsite"], tagline="이동 데이터를 더 안전한 경험으로 바꿉니다", product="차량·모바일 연동 이동 경험 플랫폼", tags=["모빌리티", "IoT", "모바일"], colors=["#06B6D4", "#0E7490"], jobs=["embedded_dev", "mobile_dev", "product_manager"]),
    dict(id="pixelharbor", name="픽셀하버", initials="PH", industry="콘텐츠", stage="early", employees="11~50명", founded=2023, hq="서울 마포구", modes=["hybrid", "remote"], tagline="브랜드가 기억되는 장면을 만듭니다", product="숏폼 콘텐츠 제작·성과 분석 스튜디오", tags=["콘텐츠", "영상", "브랜드"], colors=["#A855F7", "#7E22CE"], jobs=["motion_designer", "graphic_designer", "growth_marketing"]),
    dict(id="safelayer", name="세이프레이어", initials="SL", industry="사이버 보안", stage="stable", employees="51~100명", founded=2016, hq="서울 금천구", modes=["hybrid", "onsite"], tagline="보안을 개발 흐름 안에 자연스럽게 넣습니다", product="클라우드 보안 진단과 대응 자동화 서비스", tags=["보안", "DevSecOps", "B2B"], colors=["#64748B", "#334155"], jobs=["security_eng", "devops_sre", "qa_eng"]),
    dict(id="databridgelab", name="데이터브릿지랩", initials="DB", industry="데이터 분석", stage="growth", employees="51~100명", founded=2020, hq="서울 서초구", modes=["hybrid", "remote"], tagline="흩어진 데이터를 실행 가능한 답으로 연결합니다", product="기업용 데이터 통합·예측 분석 플랫폼", tags=["데이터", "AI", "분석"], colors=["#6366F1", "#4338CA"], jobs=["data_scientist", "data_eng", "biz_analyst"]),
    dict(id="greenlooptech", name="그린루프테크", initials="GL", industry="기후테크", stage="growth", employees="51~100명", founded=2021, hq="대전 유성구", modes=["hybrid", "onsite"], tagline="에너지 낭비를 측정하고 줄이는 루프를 만듭니다", product="사업장 에너지 사용량 분석·절감 서비스", tags=["기후테크", "에너지", "IoT"], colors=["#84CC16", "#4D7C0F"], jobs=["sw_eng", "biz_strategy", "product_designer"]),
    dict(id="cubelogics", name="큐브로직스", initials="CL", industry="스마트 제조", stage="stable", employees="301~500명", founded=2012, hq="경기 화성시", modes=["onsite", "hybrid"], tagline="제조 현장의 판단을 더 빠르고 정확하게 만듭니다", product="생산 설비 제어와 품질 예측 솔루션", tags=["제조", "임베디드", "산업 AI"], colors=["#78716C", "#44403C"], jobs=["embedded_dev", "architect", "eng_lead"]),
    dict(id="studionova", name="스튜디오노바", initials="SN", industry="디자인 스튜디오", stage="early", employees="11~50명", founded=2022, hq="서울 용산구", modes=["hybrid", "remote"], tagline="복잡한 제품을 분명한 경험으로 번역합니다", product="디지털 제품·브랜드 경험 디자인 서비스", tags=["디자인", "브랜딩", "프로덕트"], colors=["#F97316", "#C2410C"], jobs=["designer", "motion_designer", "graphic_designer"]),
    dict(id="retailscope", name="리테일스코프", initials="RS", industry="리테일테크", stage="stable", employees="101~300명", founded=2016, hq="서울 중구", modes=["hybrid", "onsite"], tagline="매장의 변화를 숫자로 먼저 발견합니다", product="온·오프라인 판매 및 재고 분석 플랫폼", tags=["리테일", "BI", "데이터"], colors=["#EAB308", "#A16207"], jobs=["data_analyst", "biz_analyst", "fullstack_dev"]),
    dict(id="eduspring", name="에듀스프링", initials="ES", industry="에듀테크", stage="growth", employees="51~100명", founded=2019, hq="서울 관악구", modes=["hybrid", "remote"], tagline="배움의 다음 단계를 개인마다 다르게 설계합니다", product="직무 학습 진단과 맞춤형 콘텐츠 플랫폼", tags=["교육", "콘텐츠", "개인화"], colors=["#0EA5E9", "#0369A1"], jobs=["fe_dev", "designer", "program_manager"]),
    dict(id="worknexus", name="워크넥서스", initials="WN", industry="HR테크", stage="growth", employees="101~300명", founded=2018, hq="서울 종로구", modes=["hybrid", "remote"], tagline="사람과 조직의 성장 신호를 연결합니다", product="인재 배치·역량 개발 HR SaaS", tags=["HR테크", "SaaS", "B2B"], colors=["#8B5CF6", "#6D28D9"], jobs=["fullstack_dev", "solutions_eng", "biz_strategy"]),
    dict(id="corestack", name="코어스택", initials="CS", industry="개발자 도구", stage="early", employees="11~50명", founded=2024, hq="서울 성동구", modes=["remote", "hybrid"], tagline="개발팀이 제품 코드에 집중할 시간을 돌려줍니다", product="백엔드 개발·배포 자동화 도구", tags=["개발자 도구", "API", "자동화"], colors=["#2563EB", "#1E3A8A"], jobs=["be_dev"]),
    dict(id="insightlabs", name="인사이트랩스", initials="IL", industry="AI 솔루션", stage="early", employees="11~50명", founded=2023, hq="대전 유성구", modes=["hybrid", "remote"], tagline="현장의 질문을 검증 가능한 모델로 바꿉니다", product="산업 데이터 기반 예측·최적화 솔루션", tags=["AI", "머신러닝", "산업 데이터"], colors=["#10B981", "#047857"], jobs=["data_scientist"]),
    dict(id="brickwhale", name="브릭웨일", initials="BW", industry="게임 플랫폼", stage="enterprise", employees="501~1,000명", founded=2010, hq="경기 성남시", modes=["hybrid", "onsite"], tagline="오래 즐길 수 있는 플레이 환경을 만듭니다", product="멀티플랫폼 게임과 라이브 운영 도구", tags=["게임", "플랫폼", "글로벌"], colors=["#EF4444", "#991B1B"], jobs=["eng_lead"]),
]


RESPONSIBILITIES = {
    "sw_eng": ["핵심 서비스 기능을 설계하고 운영합니다", "코드 품질과 배포 안정성을 개선합니다", "제품 요구사항을 기술 과제로 구체화합니다"],
    "product_manager": ["사용자 문제와 사업 목표를 제품 과제로 정의합니다", "지표와 근거로 우선순위를 조정합니다", "디자인·개발과 출시 과정을 이끕니다"],
    "be_dev": ["서비스 API와 도메인 로직을 개발합니다", "데이터 모델과 처리 성능을 개선합니다", "장애 원인을 분석하고 재발을 방지합니다"],
    "data_scientist": ["제품 문제를 분석 과제와 지표로 정의합니다", "예측 모델을 실험하고 성능을 검증합니다", "모델 결과를 제품 의사결정에 연결합니다"],
    "architect": ["서비스 확장에 맞는 시스템 구조를 설계합니다", "기술 표준과 품질 기준을 정립합니다", "복잡한 기술 의사결정을 문서화합니다"],
    "eng_lead": ["개발 조직의 목표와 실행 계획을 정렬합니다", "기술 부채와 제품 납기를 함께 관리합니다", "구성원의 성장과 협업 방식을 개선합니다"],
    "fullstack_dev": ["웹 제품의 화면과 API를 함께 개발합니다", "사용자 흐름의 성능과 안정성을 개선합니다", "기획부터 운영까지 기능 생애주기를 담당합니다"],
    "devops_sre": ["배포와 인프라 운영을 자동화합니다", "관측 지표와 장애 대응 체계를 개선합니다", "서비스 신뢰성과 비용을 함께 최적화합니다"],
    "product_designer": ["사용자 문제를 흐름과 화면 구조로 구체화합니다", "프로토타입으로 가설을 검증합니다", "제품 경험의 일관성을 관리합니다"],
    "designer": ["브랜드와 제품 목적에 맞는 시각물을 설계합니다", "다양한 채널의 디자인 품질을 관리합니다", "디자인 원칙과 산출물을 체계화합니다"],
    "program_manager": ["여러 팀의 목표·일정·의존성을 조율합니다", "프로젝트 위험을 조기에 식별하고 대응합니다", "진행 상황과 의사결정을 투명하게 공유합니다"],
    "security_eng": ["서비스와 인프라의 보안 위험을 진단합니다", "탐지·대응 절차와 자동화를 개선합니다", "개발 과정에 보안 기준을 적용합니다"],
    "biz_strategy": ["시장과 고객 데이터를 바탕으로 성장 과제를 찾습니다", "사업 가설과 실행 계획을 수립합니다", "성과 지표를 관리하고 다음 의사결정을 제안합니다"],
    "data_eng": ["분석·제품용 데이터 파이프라인을 구축합니다", "데이터 품질과 스키마를 관리합니다", "처리 성능과 운영 비용을 개선합니다"],
    "fe_dev": ["사용자에게 보이는 웹 기능을 개발합니다", "컴포넌트 품질과 접근성을 개선합니다", "로딩 성능과 오류 경험을 최적화합니다"],
    "solutions_eng": ["고객 문제를 기술 요구사항으로 변환합니다", "도입 검증과 기술 제안을 지원합니다", "제품팀에 고객의 기술 피드백을 전달합니다"],
    "data_analyst": ["제품·사업 지표를 정의하고 분석합니다", "대시보드와 정기 리포트를 운영합니다", "데이터로 문제 원인과 개선 기회를 설명합니다"],
    "growth_marketing": ["유입·전환 퍼널을 분석하고 실험합니다", "채널별 성과를 측정해 예산을 조정합니다", "고객 메시지와 캠페인을 개선합니다"],
    "biz_analyst": ["업무 요구사항과 데이터 흐름을 정의합니다", "현업과 개발 사이의 기준을 조율합니다", "운영 지표와 개선안을 구조화합니다"],
    "mobile_dev": ["iOS·Android 앱 기능을 개발하고 운영합니다", "모바일 성능과 안정성을 개선합니다", "제품·디자인과 앱 경험을 구체화합니다"],
    "qa_eng": ["제품 위험을 기준으로 테스트를 설계합니다", "반복 검증을 자동화하고 품질 지표를 관리합니다", "결함 원인을 분석해 개발 과정에 반영합니다"],
    "graphic_designer": ["브랜드 메시지를 시각 시스템으로 만듭니다", "캠페인·콘텐츠 그래픽을 제작합니다", "채널별 산출물의 일관성을 관리합니다"],
    "embedded_dev": ["장치 제어 소프트웨어를 개발합니다", "하드웨어 연동과 실시간 동작을 검증합니다", "현장 오류를 분석하고 안정성을 개선합니다"],
    "motion_designer": ["제품과 브랜드 메시지를 모션으로 표현합니다", "영상·인터랙션 에셋을 제작합니다", "채널과 기기에 맞게 결과물을 최적화합니다"],
}


STAGE_CONTENT = {
    "early": {
        "culture": ["작은 단위로 실험하고 결과를 공유합니다", "역할 경계보다 문제 해결을 우선합니다", "결정 배경을 문서로 남깁니다"],
        "benefits": ["업무 장비 선택 지원", "자율 출퇴근", "도서·교육비 지원", "월 1회 팀 리프레시 데이"],
        "process": ["서류 검토", "실무 인터뷰", "팀 인터뷰", "처우 협의"],
    },
    "growth": {
        "culture": ["목표와 지표를 공개적으로 공유합니다", "직군 간 리뷰를 기본 업무로 둡니다", "회고에서 개선 과제를 정합니다"],
        "benefits": ["선택적 근로시간제", "직무 교육비 지원", "건강검진 지원", "점심 식대 지원", "리프레시 휴가"],
        "process": ["서류 검토", "직무 인터뷰", "협업 인터뷰", "최종 인터뷰", "처우 협의"],
    },
    "stable": {
        "culture": ["역할과 책임을 명확하게 합의합니다", "운영 안정성과 개선 속도를 함께 봅니다", "데이터와 고객 근거로 결정합니다"],
        "benefits": ["유연근무제", "복지 포인트", "종합 건강검진", "사내 교육 프로그램", "장기근속 휴가"],
        "process": ["서류 검토", "온라인 과제", "1차 직무 인터뷰", "2차 조직 인터뷰", "처우 협의"],
    },
    "enterprise": {
        "culture": ["장기 목표와 실행 기준을 함께 관리합니다", "전문 영역 간 협업 절차를 존중합니다", "기술 품질과 사용자 영향을 함께 검토합니다"],
        "benefits": ["유연근무제", "복지 포인트", "가족 건강검진", "사내 식당", "직무·리더십 교육", "장기근속 포상"],
        "process": ["서류 검토", "코딩·직무 과제", "실무 인터뷰", "리더 인터뷰", "처우 협의"],
    },
}


LEVEL_RULES = {
    "신입": (0, 12, 3600),
    "주니어": (12, 48, 4300),
    "미들": (36, 84, 5600),
    "시니어": (60, 144, 7200),
    "리드": (84, None, 8800),
}
LEVEL_SEQUENCE = ["미들", "주니어", "시니어", "신입", "미들", "리드"]


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def select_skills(job_id: str, rows_by_job: dict[str, list[dict]]) -> tuple[list[str], list[str]]:
    rows = sorted(
        rows_by_job[job_id],
        key=lambda r: (
            bool(r.get("pinned")),
            r.get("importance") or r.get("evidence") or r.get("weight") or 0,
            r.get("docFreq") or 0,
        ),
        reverse=True,
    )
    must_pool = [r["skillId"] for r in rows if r.get("requirement") == "required" or r.get("tier") == "required"]
    if len(must_pool) < 5:
        must_pool.extend(r["skillId"] for r in rows if r["skillId"] not in must_pool)
    must = list(dict.fromkeys(must_pool))[:5]
    nice_pool = [r["skillId"] for r in rows if r.get("requirement") == "preferred" or r.get("tier") == "preferred"]
    nice_pool.extend(r["skillId"] for r in rows if r["skillId"] not in must and r["skillId"] not in nice_pool)
    return must, list(dict.fromkeys(nice_pool))[:4]


def salary_for(index: int, level: str, rnd: random.Random) -> dict:
    base = LEVEL_RULES[level][2]
    form = index % 4
    if form == 1:
        return {"display": "면접 후 협의", "currency": "KRW", "unit": "만원"}
    if form == 2:
        return {"display": "회사 내규에 따름", "currency": "KRW", "unit": "만원"}
    lo = round((base * rnd.uniform(0.94, 1.06)) / 100) * 100
    hi = round((lo * rnd.uniform(1.16, 1.28)) / 100) * 100
    return {"display": f"{lo:,}~{hi:,}만원", "min": lo, "max": hi, "currency": "KRW", "unit": "만원"}


def run() -> None:
    rnd = random.Random(SEED)
    jobs = json.loads((DATA / "interim" / "jobs.json").read_text(encoding="utf-8"))
    matrix = json.loads((DATA / "interim" / "job-skills.json").read_text(encoding="utf-8"))
    job_by_id = {j["id"]: j for j in jobs}
    rows_by_job: dict[str, list[dict]] = defaultdict(list)
    for row in matrix:
        rows_by_job[row["jobId"]].append(row)

    companies = []
    postings = []
    job_occurrence = Counter()
    posting_index = 0

    for spec in COMPANY_SPECS:
        stage = STAGE_CONTENT[spec["stage"]]
        companies.append({
            "id": spec["id"],
            "name": spec["name"],
            "tagline": spec["tagline"],
            "description": f"{spec['name']}는 {spec['product']}를 만드는 가상 기업입니다. 사용자 문제와 운영 데이터를 함께 살피며 제품을 개선합니다.",
            "industry": spec["industry"],
            "stage": spec["stage"],
            "employeeCountRange": spec["employees"],
            "foundedYear": spec["founded"],
            "headquarters": spec["hq"],
            "locations": [spec["hq"]],
            "workModes": spec["modes"],
            "productDescription": spec["product"],
            "products": [spec["product"]],
            "tags": spec["tags"],
            "culture": stage["culture"],
            "benefits": stage["benefits"],
            "hiringProcess": stage["process"],
            "websiteUrl": None,
            "imageUrls": [],
            "brand": {"initials": spec["initials"], "colorFrom": spec["colors"][0], "colorTo": spec["colors"][1]},
            "isSynthetic": True,
            "synthesisBasis": SYNTHESIS_BASIS,
            "generatedAt": GENERATED_AT,
        })

        for job_id in spec["jobs"]:
            posting_index += 1
            job_occurrence[job_id] += 1
            job = job_by_id[job_id]
            level = LEVEL_SEQUENCE[(posting_index + job_occurrence[job_id]) % len(LEVEL_SEQUENCE)]
            min_months, max_months, _ = LEVEL_RULES[level]
            must, nice = select_skills(job_id, rows_by_job)
            posted = SNAPSHOT - timedelta(days=3 + (posting_index * 7) % 43)
            deadline_type = "rolling" if posting_index % 3 == 0 else "date"
            deadline = None if deadline_type == "rolling" else (SNAPSHOT + timedelta(days=18 + (posting_index * 5) % 43)).isoformat()
            work_mode = spec["modes"][(posting_index - 1) % len(spec["modes"])]
            title_prefix = "" if level in {"신입", "주니어", "미들"} else f"{level} "
            documents = ["이력서"]
            if job["family"] == "디자인":
                documents.append("포트폴리오")

            postings.append({
                "id": f"demo_{spec['id']}_{job_id}",
                "companyId": spec["id"],
                "jobId": job_id,
                "title": f"{title_prefix}{job['title']}",
                "jobFamily": job["family"],
                "level": level,
                "minCareerMonths": min_months,
                "maxCareerMonths": max_months,
                "employmentType": "계약직" if posting_index % 11 == 0 else "정규직",
                "workMode": work_mode,
                "location": spec["hq"],
                "summary": f"{spec['product']}의 다음 기능과 운영 품질을 함께 만들어 갈 {job['title']}를 찾습니다.",
                "responsibilities": RESPONSIBILITIES[job_id],
                "mustSkillIds": must,
                "niceSkillIds": nice,
                "benefits": stage["benefits"][:4],
                "hiringProcess": stage["process"],
                "applicationDocuments": documents,
                "salary": salary_for(posting_index, level, rnd),
                "postedAt": posted.isoformat(),
                "deadlineType": deadline_type,
                "deadline": deadline,
                "status": "open",
                "isSynthetic": True,
                "synthesisBasis": f"{SYNTHESIS_BASIS};job={job_id}",
                "generatedAt": GENERATED_AT,
            })

    write_json(DATA / "demo-companies.json", companies)
    write_json(DATA / "demo-job-postings.json", postings)
    write_json(DATA / "demo-company-meta.json", {
        "schemaVersion": "1.0",
        "snapshotDate": SNAPSHOT.isoformat(),
        "seed": SEED,
        "isSynthetic": True,
        "purpose": "실제 회사·공고 공급원을 연결하기 전 조회·지원 UI를 검증하는 목업",
        "actualDataUse": "공개 페이지의 필드 구조만 참고했으며 회사명·소개 문구·로고·공고 원문은 복제하지 않음",
        "fieldModelSources": [
            {"name": "원티드 공개 채용공고", "url": "https://www.wanted.co.kr/wd/70297", "usedFor": "회사·직무·경력·업무·자격요건·근무지·마감·전형 필드"},
            {"name": "원티드 기업회원 도움말", "url": "https://help.wanted.co.kr/hc/ko/categories/360001832811", "usedFor": "기업명·주소·웹사이트·태그·로고·이미지 필드"},
            {"name": "잡플래닛 서비스 안내", "url": "https://www.jobplanet.co.kr/events/membership", "usedFor": "회사 탐색에서 쓰이는 정보 범주 확인; 리뷰·평점은 생성 대상에서 제외"},
        ],
        "distribution": {
            "companiesByStage": dict(sorted(Counter(c["stage"] for c in companies).items())),
            "companiesByIndustry": dict(sorted(Counter(c["industry"] for c in companies).items())),
            "workModeAvailability": dict(sorted(Counter(mode for c in companies for mode in c["workModes"]).items())),
            "postingsByJob": dict(sorted(job_occurrence.items())),
            "salaryDisplayForm": dict(sorted(Counter(
                "range" if p["salary"].get("min") is not None else
                "negotiable" if p["salary"]["display"] == "면접 후 협의" else "policy"
                for p in postings
            ).items())),
        },
        "replaceableContracts": ["Company", "JobPosting"],
    })
    print(f"가상 회사 {len(companies)}개 · 가상 공고 {len(postings)}개 · 직무 {len(job_occurrence)}개")
    print(f"→ {DATA / 'demo-companies.json'}")
    print(f"→ {DATA / 'demo-job-postings.json'}")
    print(f"→ {DATA / 'demo-company-meta.json'}")


if __name__ == "__main__":
    run()
