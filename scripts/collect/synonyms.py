"""표기 통합 사전 — 같은 것을 가리키는 다른 이름을 하나로 모은다.

왜 필요한가
  계약(docs/DATA_SPEC.md)이 가장 강조한 항목이다.
    "표기 통합이 제일 중요하다. 프론트엔드/FE/Frontend 를 따로 두면
     전부 희소 스킬로 잡혀 점수가 망가진다."

  코퍼스 관찰만으로는 안 된다. MySQL 과 PostgreSQL 은 서로 다른 단어로 등장하므로
  아무리 세어도 같은 것으로 묶이지 않는다. 사람이 판단해 적어야 한다.

세 가지를 담는다
  DROP    잡음. 스킬이 아닌데 살아남은 것
  MERGE   canonical → 흡수할 이름들
  ALIAS   canonical → 코퍼스에 없지만 이력서에 나올 표기 (한글 음차 등)
"""

# ── 잡음 ────────────────────────────────────────────────────────────────
# 허용 목록·대문자 비율·관용구 차단을 통과했지만 스킬이 아닌 것들.
DROP = {
    # 문장 첫 단어가 대문자로 굳어진 경우
    "star", "rest", "inc", "md", "al", "abl", "flux", "flex", "box", "metro",
    "rocket", "ros", "temporal", "vault", "ray", "pulsar", "canva",
    # 회사명 — 그 회사를 쓰는 것이 역량은 아니다
    "doordash", "coca-cola", "nvidia", "shopify", "stripe", "salesforce", "hubspot",
    # 기관·법령 — 공공기관 공고 상용구
    "개인정보 보호법", "근로기준법", "사전검증", "적용 운영", "체계 구축",
    "위탁사업 운영", "사업운영", "기획운영", "원인 분석", "기술 분석",
    "산업전략 기술분석", "배전자동화", "온라인 모니터링",
}

# ── 통합 ────────────────────────────────────────────────────────────────
# 왼쪽이 대표 표기, 오른쪽이 흡수될 이름들.
MERGE = {
    # 관계형 데이터베이스 — 제품이 달라도 커리어에서는 같은 역량으로 통한다.
    # 계약의 예시 파일도 MySQL·PostgreSQL 을 SQL 의 별칭으로 묶었다.
    "SQL": ["MySQL", "PostgreSQL", "TiDB", "RDBMS", "DBMS"],
    # 같은 것의 표기 차이
    "LLM": ["LLMs", "GenAI"],
    "REST API": ["RESTful", "RESTful API"],
    "Spring": ["Spring Framework"],
    "HTML": ["HTML5"],
    "UX/UI": ["UX", "UI"],
    "MSA": ["Microservices Architecture"],
    # 한국어 — '정보시스템'과 '시스템'은 공고에서 같은 뜻으로 쓰인다
    "시스템 개발": ["정보시스템 개발", "전산개발", "전산지원 개발", "기반 개발"],
    "시스템 구축": ["정보시스템 구축", "플랫폼 구축", "파이프라인 구축"],
    "시스템 운영": ["정보시스템 운영", "서비스 운영"],
    "소프트웨어 개발": ["소프트웨어 엔지니어링", "웹프로그램 개발", "서비스 개발", "플랫폼 개발"],
    "데이터 분석": ["빅데이터 분석"],
    "그래픽 디자인": ["포토샵 일러스트"],
    "기획": ["전략 기획", "경영기획", "상품기획", "콘텐츠기획"],
}

# ── 추가 별칭 ───────────────────────────────────────────────────────────
# 코퍼스에는 없지만 이력서에는 나올 표기. 매칭률을 높인다.
ALIAS = {
    "Python": ["파이썬"],
    "Java": ["자바"],
    "JavaScript": ["자바스크립트", "JS"],
    "TypeScript": ["타입스크립트", "TS"],
    "React": ["리액트", "React.js", "ReactJS"],
    "Vue": ["뷰", "Vue.js", "VueJS"],
    "Angular": ["앵귤러"],
    "Node.js": ["노드", "NodeJS", "Node"],
    "Kubernetes": ["쿠버네티스", "k8s", "K8S"],
    "Docker": ["도커"],
    "AWS": ["아마존 웹서비스", "Amazon Web Services"],
    "Azure": ["애저", "Microsoft Azure"],
    "SQL": ["에스큐엘", "쿼리", "관계형 데이터베이스", "RDB"],
    "Linux": ["리눅스"],
    "Git": ["깃"],
    "GitHub": ["깃허브"],
    "Figma": ["피그마"],
    "Photoshop": ["포토샵", "PS", "Adobe Photoshop"],
    "Illustrator": ["일러스트레이터", "일러스트", "AI(일러스트)", "Adobe Illustrator"],
    "Golang": ["Go 언어", "고랭"],
    "Kotlin": ["코틀린"],
    "Swift": ["스위프트"],
    "Spring": ["스프링"],
    "Spring Boot": ["스프링부트", "스프링 부트"],
    "Django": ["장고"],
    "FastAPI": ["패스트API"],
    "Redis": ["레디스"],
    "MongoDB": ["몽고DB", "몽고디비"],
    "Elasticsearch": ["엘라스틱서치", "ES"],
    "Airflow": ["에어플로우", "Apache Airflow"],
    "Jira": ["지라"],
    "Confluence": ["컨플루언스"],
    "Slack": ["슬랙"],
    "Tableau": ["태블로"],
    "PyTorch": ["파이토치"],
    "TensorFlow": ["텐서플로우", "텐서플로"],
    "UX/UI": ["UI/UX", "유엑스", "사용자 경험", "사용자 인터페이스"],
    "LLM": ["대규모 언어모델", "거대언어모델"],
    "REST API": ["레스트 API", "RESTful 아키텍처"],
    "MSA": ["마이크로서비스", "마이크로서비스 아키텍처"],
    "ETL": ["데이터 파이프라인"],
    "SEO": ["검색엔진 최적화"],
    "CRM": ["고객관계관리"],
    "ERP": ["전사적자원관리"],
    "hwp": ["한글", "아래아한글", "한컴오피스"],
    "PowerPoint": ["파워포인트", "PPT"],
    "데이터 분석": ["데이터분석", "data analysis"],
    "시각디자인": ["비주얼 디자인", "visual design"],
    "그래픽 디자인": ["graphic design"],
    "영상촬영": ["영상 촬영", "비디오 촬영"],
    "통계 분석": ["통계분석", "statistical analysis"],
    "시스템 설계": ["아키텍처 설계", "system design"],
    "모바일 개발": ["앱 개발", "모바일 앱 개발"],
    "정보처리기사": ["정보처리산업기사"],
}


def build(names: list[str]):
    """(대표표기 → 흡수될 이름들, 이름 → 대표표기) 를 실제 존재하는 것으로만 만든다."""
    have = {n.lower(): n for n in names}
    merge, to_canon, rename = {}, {}, {}
    for canon, subs in MERGE.items():
        real = [have[s.lower()] for s in subs if s.lower() in have]
        # 대표 표기가 사전에 없으면 흡수될 것 중 가장 먼저 있는 것을 대표로 쓴다
        head = have.get(canon.lower())
        if head is None:
            if not real:
                continue
            # 대표 표기가 사전에 없다 — 흡수될 것 중 첫째를 자리로 쓰고 이름만 바꾼다.
            # 그래야 'UX' 가 'UI' 를 흡수한 뒤 화면에 'UX/UI' 로 나온다.
            head, real = real[0], real[1:]
            rename[head] = canon
        if not real:
            continue
        merge[head] = real
        for r in real:
            to_canon[r] = head
    return merge, to_canon, rename
