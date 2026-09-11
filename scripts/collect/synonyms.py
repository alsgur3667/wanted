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
    # 두 글자라 뜻이 갈린다 — 위 Photoshop 주석 참조
    "ps",
    #  "UI" 를 뺀다. 이력서 테스트에서 QA 엔지니어의 "UI 자동화 테스트"가
    #  UX/UI 역량으로 잡혔다. 코퍼스에서 재 봤더니 'UI' 만 잡히고 UX 계열이 없는
    #  공고 41건이 **전부 개발 문맥**이었다 — UI components · UI library ·
    #  Server-Driven UI framework · UI tests · UI-Frameworks. 디자인 역량이 아니다.
    #  UX 는 155건으로 뜻이 갈리지 않아 그대로 둔다.
    #  ⚠️ MERGE 에서만 빼면 안 된다. 코퍼스에 119건 있어 별도 스킬로 남는다.
    "ui",
    # 회사명 — 그 회사를 쓰는 것이 역량은 아니다
    "doordash", "coca-cola", "nvidia", "shopify", "stripe", "salesforce", "hubspot",
    #  아래 셋은 이력서 테스트에서 임베디드 우대 목록을 보다 찾았다. 원문을 직접 확인했다.
    #    AMD    "backed by AMD, Atreides, Benchmark Capital…"  → 투자사 목록
    #    Lenovo "brands - including Walmart, Uber, Shopify, Lenovo…" → 고객사 목록
    #           "Freie Wahl zwischen MacBook und Lenovo"             → 복지 문구
    #    Lucid  7건 전부 Lucid Motors(고객사)·Lucid Vision(카메라 제조사). 작도 도구가 아니다.
    #  ⚠️ Arm 은 남긴다 — "Arm SoC with real-time processing" 로 진짜 기술이다.
    #  ⚠️ 이 방식으로 자동 판별을 시도했더니 Keras·XGBoost·Asana 처럼 진짜 도구가
    #     "such as …" 목록에 나온다는 이유로 같이 잡혔다. 눈으로 확인한 것만 넣는다.
    "amd", "lenovo", "lucid",
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
    #  같은 도구가 두 스킬로 갈려 있었다 — 이력서 테스트에서 잡혔다.
    "GA4": ["Google Analytics"],
    "Spring": ["Spring Framework"],
    "HTML": ["HTML5"],
    "UX/UI": ["UX"],
    # ⚠️ ALIAS 에만 적으면 안 된다. 코퍼스에 그 표기가 실제로 있으면 **별도 스킬로 남아**
    #    같은 기술이 둘로 갈린다. 실제로 Airflow/Apache Airflow, Photoshop/Adobe Photoshop,
    #    Vue/Vue.js, MSA/마이크로서비스 아키텍처 가 각각 두 스킬로 세어지고 있었다.
    #    ALIAS 는 "코퍼스에 없지만 이력서에 나올 표기", MERGE 는 "코퍼스에 있어 흡수할 표기"다.
    "MSA": ["Microservices Architecture", "마이크로서비스", "마이크로서비스 아키텍처"],
    "Airflow": ["Apache Airflow"],
    #  코퍼스에 실제로 있는 표기라 ALIAS 로는 못 막는다 — 흡수해야 한 스킬이 된다
    "JavaScript": ["JS"],
    "Illustrator": ["Adobe Illustrator"],
    "Photoshop": ["Adobe Photoshop"],
    "Vue": ["Vue.js", "VueJS"],
    # 한국어 — '정보시스템'과 '시스템'은 공고에서 같은 뜻으로 쓰인다
    "시스템 개발": ["정보시스템 개발", "전산개발", "전산지원 개발", "기반 개발"],
    # "파이프라인 구축" 을 뺐다 — 코퍼스 13건이 전부 "CI/CD 파이프라인 구축"·"데이터
    # 파이프라인 구축"이었다. 시스템 구축과 다른 일이다.
    "시스템 구축": ["정보시스템 구축", "플랫폼 구축"],
    # "서비스 운영" 을 뺐다 — 코퍼스 18건이 "CS Handyman 서비스 운영"·"고객 서비스 운영
    # 지원"처럼 고객 응대였다. 시스템 운영이 아니다.
    "시스템 운영": ["정보시스템 운영"],
    "소프트웨어 개발": ["소프트웨어 엔지니어링", "웹프로그램 개발", "서비스 개발", "플랫폼 개발"],
    "데이터 분석": ["빅데이터 분석"],
    "그래픽 디자인": ["포토샵 일러스트"],
    # ⚠️ '기획' 으로 묶었다가 되돌렸다. 대표명이 너무 포괄적이라 어느 직무에서도
    #    변별력을 얻지 못해 매핑이 0개가 됐다. 전략 기획과 상품기획은 다른 일이다.

    # ── AI 도구 ─────────────────────────────────────────────────────
    # 공고가 이미 하나로 묶어 나열한다.
    #   "Integrate AI tools (e.g., Cursor, Copilot, Claude) into your daily workflow"
    #   "modernen KI-Tools wie Copilot, Claude, Cursor, Codex"
    # 어느 것을 쓰느냐가 아니라 'AI 도구를 업무에 쓰는가'가 요구사항이다.
    # 개별 도구는 커리어 차별점이 아니므로 하나로 본다.
    #
    # ⚠️ LangChain·LangGraph·OpenAI·Anthropic 은 여기 넣지 않는다.
    #    그쪽은 'AI 를 쓰는 것'이 아니라 'AI 를 만드는 것'이라 성격이 다르다.
    "AI 코딩 도구": ["Claude", "Cursor", "ChatGPT", "Copilot", "Windsurf",
                 "Gemini", "Perplexity", "Lovable", "Codex", "v0"],
}

# ── 추가 별칭 ───────────────────────────────────────────────────────────
# 코퍼스에는 없지만 이력서에는 나올 표기. 매칭률을 높인다.
# ── 업무 역량의 영어 표기 ────────────────────────────────────────────────
#
# 우리 업무 역량은 한글로만 적혀 있었다. 그런데 공고의 52%가 영어·독일어라
# **영어 공고에서는 이 역량들이 하나도 안 잡혔다.**
# 실측: 프로덕트 매니저 150건 중 55건이 '역량 0개'였다. 공고가 비어서가 아니라 우리가 못 읽어서다.
#
# 후보를 지어내지 않고 코퍼스로 걸렀다. 두 관문을 통과한 것만 넣는다.
#   ① 등장 비율 0.5~30%   — 너무 흔하면 별칭이 아니다 (communication 34% 기각)
#   ② 직무 변별력 3.0 이상 — 한 직무에 몰려야 역량이다
#      기준선: Java 4.7 · Kubernetes 4.5 · Figma 9.9
#  ⚠️ 수기 업무 역량(이해관계자 조율·우선순위 관리 등)은 여기가 아니라
#     data/work-skills.json 에 넣는다. 그 표는 ALIAS 를 거치지 않는다.
#      기각: infrastructure 1.8 · cross-functional 1.8 · stakeholder 3.0(경계) ·
#            performance optimization 2.1 — 여러 직무에 고루 퍼져 변별력이 없다
ALIAS = {
    "시스템 아키텍처": ["system architecture"],
    "데이터 시각화": ["data visualization"],
    "성능 최적화": ["performance tuning"],
    "데이터 엔지니어링": ["data engineering"],
    "제품 개발": ["product development"],
    "Python": ["파이썬"],
    "Java": ["자바"],
    "JavaScript": ["자바스크립트", "JS"],
    "TypeScript": ["타입스크립트", "TS"],
    "React": ["리액트", "React.js", "ReactJS"],
    # "뷰" 를 뺐다 — 코퍼스 2건이 "그래프 뷰"·"모바일 웹 뷰"로 둘 다 거짓이었다.
    "Vue": ["Vue.js", "VueJS"],
    "Angular": ["앵귤러"],
    # "노드" 를 뺐다 — "지도 데이터는 방대한 노드와 경로로" 처럼 그래프의 노드를 잡는다.
    # Node.js 는 "Node.js" 표기로 이미 잡히니 잃는 것이 없다.
    "Node.js": ["NodeJS", "Node"],
    "Kubernetes": ["쿠버네티스", "k8s", "K8S"],
    "Docker": ["도커"],
    #  마케팅 어휘. 이력서 테스트에서 퍼포먼스 마케터 이력서의 역량을 2개밖에
    #  못 잡아 직군을 '개발'로 읽었다. 실제 공고는 GA4·메타/구글 광고·ROAS 를 요구한다.
    #
    #  ⚠️ 맨 "GA" 는 넣지 않는다. 코퍼스에서 재 봤더니 5건 중 4건이 거짓이었다 —
    #     "GA drawings"(General Arrangement) · "GA release"(General Availability).
    #     한국어 이력서의 "GA" 를 놓치는 것은 알고 두는 빚이다.
    "GA4": ["구글 애널리틱스", "구글애널리틱스", "Google Analytics 4"],
    "Google Ads": ["구글 광고", "구글 애즈", "Google AdWords", "애드워즈", "구글애즈"],
    #  ⚠️ CPA 는 우리 사전에서 공인회계사 자격증이다. 광고 지표로 쓰면 안 된다.
    "성과 분석": ["ROAS", "CTR", "CVR", "광고 성과", "매체 성과", "전환 성과"],
    "AWS": ["아마존 웹서비스", "Amazon Web Services"],
    "Azure": ["애저", "Microsoft Azure"],
    "SQL": ["에스큐엘", "쿼리", "관계형 데이터베이스", "RDB"],
    "Linux": ["리눅스"],
    "Git": ["깃"],
    "GitHub": ["깃허브"],
    "Figma": ["피그마"],
    #  ⚠️ "PS" 를 뺐다. 코퍼스에서 이 두 글자가 포토샵인 경우가 **한 건도 없었다** —
    #     독일어 공고의 추신("PS: auch in Teilzeit möglich"), Professional Services (PS),
    #     침입탐지 ID/PS 였다. 별칭으로 두면 그 공고들이 디자이너 쪽으로 세어진다.
    "Photoshop": ["포토샵", "Adobe Photoshop"],
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
    "UX/UI": ["UI/UX", "유엑스", "사용자 경험", "사용자 인터페이스",
              "UI 디자인", "UI/UX 디자인", "UX 디자인"],
    "LLM": ["대규모 언어모델", "거대언어모델"],
    "REST API": ["레스트 API", "RESTful 아키텍처"],
    "MSA": ["마이크로서비스", "마이크로서비스 아키텍처"],
    "ETL": ["데이터 파이프라인"],
    "SEO": ["검색엔진 최적화"],
    "CRM": ["고객관계관리"],
    "ERP": ["전사적자원관리"],
    # "한글" 을 뺐다 — 공고는 "hwp(한글) 파일"이라 hwp 로 이미 잡히고,
    # 해설 글에서는 "이재원님의 한글 자막"을 잡았다.
    "hwp": ["아래아한글", "한컴오피스"],
    "PowerPoint": ["파워포인트", "PPT"],
    "데이터 분석": ["데이터분석", "data analysis"],
    "시각디자인": ["비주얼 디자인", "visual design"],
    "그래픽 디자인": ["graphic design"],
    "영상촬영": ["영상 촬영", "비디오 촬영"],
    "통계 분석": ["통계분석", "statistical analysis"],
    "시스템 설계": ["아키텍처 설계", "system design"],
    "모바일 개발": ["앱 개발", "모바일 앱 개발"],
    "정보처리기사": ["정보처리산업기사"],
    # "생성형 AI" 를 뺐다 — 코퍼스 16건이 "생성형 AI 기반 CS 운영 효율화"·"머신러닝,
    # 생성형 AI, 에이전틱 AI" 처럼 기술 범주를 가리켰다. 코딩 도구가 아니다.
    "AI 코딩 도구": ["AI 코딩", "AI 도구", "코파일럿", "GitHub Copilot",
                 "Claude Code", "AI-assisted coding", "AI coding assistant"],
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
