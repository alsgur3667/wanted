"""스킬 허용 목록 — '이것이 진짜 스킬 이름인가'와 '어떤 종류인가'를 함께 판정할 사전.

왜 차단이 아니라 허용인가
  손으로 차단 목록을 만들면 끝이 없다. IMPORTANT·NOTICE·OTE·KDN 처럼
  예상 못 한 것이 새 데이터마다 나온다.
  "공개된 목록에 있는 이름만 인정한다"로 뒤집으면 한 번 만들어 두고 쓴다.

  ⚠️ 다만 공개 목록 셋은 '브랜드와 언어' 목록이지 '스킬' 목록이 아니다.
     GCP·MLOps·CISSP 같은 약어·개념·자격증은 어디에도 없어서 직접 적었다.
     차단 목록과 달리 이쪽은 끝이 있다 — 잘 알려진 유한한 어휘다.

왜 유형까지 매기나
  자격증과 문서 도구는 스킬과 성격이 다르다.
    · 2×2 지도에 '정보처리기사'를 좌표로 찍는 것은 의미가 없다. 있냐 없냐의 문제다.
    · 채우는 방법이 다르다 — 자격증은 시험, 도구는 며칠, 스킬은 수개월.
      Route.gapSkills 의 firstStep 과 estimatedMonths 가 유형마다 달라진다.
  그래서 유형을 붙여 두고, 지도에 올릴 것과 부가 정보로 보여줄 것을 가른다.

  출처가 곧 유형이 된다 — Linguist 에서 왔으면 언어, simple-icons 에서 왔으면 도구.

산출: data/raw/ontology/allowlist.json
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import polite_get, RAW, now_kst  # noqa: E402

OUT = RAW / "ontology" / "allowlist.json"

SRC = {
    "linguist": "https://raw.githubusercontent.com/github-linguist/linguist/main/lib/linguist/languages.yml",
    "simple_icons": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/data/simple-icons.json",
    "devicon": "https://raw.githubusercontent.com/devicons/devicon/master/devicon.json",
}

# 유형 우선순위 — 여러 목록에 걸치면 앞선 것을 쓴다.
# Python 은 Linguist 와 simple-icons 양쪽에 있으나 언어로 본다.
TYPE_ORDER = ["language", "certification", "office", "domain", "concept", "tool"]

# ── 기술 개념·방법론 ─ 지도에 올린다 ────────────────────────────────────
CONCEPT = """
rest restful graphql grpc soap websocket webhook oauth jwt saml sso
msa soa ddd tdd bdd solid oop mvc mvvm sdlc uml
etl elt cdc dw olap oltp rdbms dbms orm jpa jdbc odbc nosql
iac gitops devsecops sre cicd k8s
rbac abac siem soar waf ddos vpn pki mfa zta
llm llms genai rag mlops llmops nlp ocr asr tts rnn cnn gan transformer
gpu cuda tpu simd
uat regression e2e
a11y wcag hci usability wireframe prototyping
blockchain nft web3
""".split()

# ── 직무 영역 용어 ─ 지도에 올린다 ─────────────────────────────────────
DOMAIN = """
ux ui seo sem ga4 utm
erp crm scm plm mes wms hrm lms cms dam
bi iot ar vr xr
""".split()

# ── 자격증 ─ 지도에 올리지 않는다. 시험으로 채우는 것 ───────────────────
CERTIFICATION = """
cissp cisa cism crisc ccsp ceh oscp cppg isms isms-p
pmp prince2 pmi-acp csm psm
ccna ccnp ccie
ocp oca ocjp ocm scjp
rhcsa rhce lpic comptia
itil cobit togaf
cfa frm cpa aicpa kicpa cia cma
sqld sqlp adsp adp dap
정보처리기사 정보보안기사 빅데이터분석기사 사회조사분석사 컴퓨터활용능력
topcit itq gtq mos 워드프로세서 전산회계
gaiq
""".split()

# ── 문서·업무 도구 ─ 지도에 올리지 않는다. 며칠이면 되는 것 ─────────────
OFFICE = """
excel powerpoint word outlook hwp ppt xls doc
google-sheets google-docs google-slides notion confluence
""".split()

# 어느 목록에 있든 스킬로 쓸 수 없는 것.
# 너무 포괄적이라 어느 직무에나 붙어 변별력이 0 이다.
TOO_BROAD = {
    "ai", "it", "sw", "hw", "ict", "web", "app", "apps", "data", "cloud",
    "software", "hardware", "system", "systems", "tech", "technology", "digital",
    "mobile", "desktop", "server", "client", "backend", "frontend", "database",
    "network", "security", "design", "test", "testing", "code", "coding", "dev",
    "saas", "paas", "iaas", "b2b", "b2c", "kpi", "kpis", "roi", "sla", "slas",
    "slo", "slos", "poc", "mvp", "ote", "fte", "pto", "fto", "wfh", "eap", "hsa",
    "eod", "asap", "fyi", "faq", "tbd", "n/a", "cs", "ir", "pr", "ma", "to", "at",
    "important", "notice", "note", "new", "open", "free", "full", "part",
    "you", "your", "we", "and", "what", "about", "learn", "bold", "tasks",
    "benefits", "speaking", "profil", "level2", "z.b", "win", "cv",
    # 공고 관용구 — 문장 중간에서도 대문자로 쓰여 대문자 비율 필터를 통과한다.
    # "Basic knowledge of ...", "Fluent in English", "modern framework"
    "basic", "fluent", "framework", "frameworks", "native", "advanced", "expert",
    "senior", "junior", "lead", "principal", "staff", "intern", "manager",
    "solution", "solutions", "platform", "platforms", "service", "services",
    "product", "products", "project", "projects", "process", "processes",
    # 프로토콜 — 누구나 쓰는 것이라 역량으로 구별되지 않는다.
    # (ssl·tls·ssh 는 보안 맥락에서 의미가 있어 남긴다)
    "http", "https", "tcp", "udp", "ip", "dns", "ftp", "smtp", "url", "uri",
    # 공고 문구 — 대문자 비율 필터를 통과한다 ("Dein Profil", "GitHub profile")
    "profile", "profiles", "portfolio", "resume", "cv",
    # 실측으로 확인한 오탐
    "ada",        # 원문은 ADA(Americans with Disabilities Act). 미국 공고의 법률 문구
    "console",    # "Google Search Console" 의 일부일 뿐 단독으로는 뜻이 없다
    "notebook",   # "Notebook-basierten Workflows" — 단독으로는 도구가 아니다
    "hack",       # "individual productivity hack" 一 일반 단어
    # 접두어일 뿐 단독으로는 뜻이 없다 ("Apache Airflow"·"Apache Kafka" 는 별도 항목으로 있다)
    "apache",
}

# 회사·서비스 이름. 그 회사를 쓰는 것이 역량은 아니다.
#   Linux·Android·iOS 는 여기 넣지 않는다 — 개발자에게는 실제 역량이다.
NOT_SKILL = {
    "google", "microsoft", "apple", "amazon", "meta", "facebook", "netflix", "uber",
    "airbnb", "spotify", "twitter", "linkedin", "instagram", "youtube", "tiktok",
    "gmail", "zoom", "discord", "telegram", "whatsapp",
    "chrome", "safari", "firefox", "edge",
    # 회사·서비스명 — 실측으로 확인한 오탐
    "kununu",      # 독일 기업평가 사이트. "Kununu TOP Company" 수상 문구
    "anthropic",   # 회사명. "About Anthropic"·"APIs (e.g., xAI, Anthropic)"
    "salt",        # 19건 전부 "Salt Lake City" 지명이었다
    # ── 아래는 본문 문맥을 하나씩 읽고 판별한 것이다. 목록에 있다고 무조건 뺀 것이 아니다.
    # 고객사·투자사로 나열된 이름
    "mastercard",  # "shareholders in the industry like Mastercard"
    "headspace",   # "apps like Adobe, Headspace, and LEGO"
    "paypal",      # "giants like PayPal, Stripe, and Microsoft"
    "rakuten",     # "DoorDash, Match Group, Noom, Yahoo Sports, Rakuten"
    "unilever",    # "companies including Lyft, Google X, HCA, Unilever"
    "deliveroo",   # "DoorDash, Wolt, or Deliveroo"
    "expedia",     # 복리후생 할인 브랜드 — "brands, e.g. Adidas, Apple, Expedia"
    # 채용 회사 본인의 이름
    "hellofresh", "reddit", "duckduckgo",
    # 제품·단체 이름의 일부이거나 일반 단어
    "tower",       # "Control Tower"
    "black",       # "Black Socialists in America"
    "fusion",      # "nuclear fusion"
    "greenhouse",  # ATS 이름이 아니라 "greenhouse gases such as CO2" 였다
    "siemens",     # 스킬은 "Siemens Teamcenter" 쪽이지 회사명이 아니다
}
# 판별해 **남긴** 것 — 목록에 있어도 문맥이 기술을 가리키면 지우지 않는다.
#   IONOS     "Cloud (z. B. AWS, Azure, IONOS, Google)"  독일 클라우드 사업자
#   Solana · Polkadot · Ethereum   "Blockchain (Ethereum/Ethers.js/Wagmi/Viem/Solana)"
#   v0        "the team behind Next.js, v0, and AI SDK"  Vercel 의 AI UI 생성 도구


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def from_linguist():
    """languages.yml — 언어 이름과 별칭. YAML 파서 없이 필요한 줄만 읽는다."""
    txt = polite_get(SRC["linguist"], timeout=60).text
    out, cur = set(), None
    for line in txt.splitlines():
        m = re.match(r"^([A-Za-z0-9][^:]*):\s*$", line)
        if m:
            cur = m.group(1).strip().strip('"')
            out.add(norm(cur))
            continue
        m = re.match(r"^\s+-\s+(.+?)\s*$", line)
        if m and cur:
            v = m.group(1).strip().strip('"')
            if re.fullmatch(r"[A-Za-z0-9+#.\- ]{2,30}", v):
                out.add(norm(v))
    return {x for x in out if x}


def from_simple_icons():
    d = json.loads(polite_get(SRC["simple_icons"], timeout=60).text)
    items = d.get("icons", d) if isinstance(d, dict) else d
    out = set()
    for it in items:
        if isinstance(it, dict) and it.get("title"):
            out.add(norm(it["title"]))
        elif isinstance(it, str):
            out.add(norm(it))
    return {x for x in out if x}


def from_devicon():
    d = json.loads(polite_get(SRC["devicon"], timeout=60).text)
    out = set()
    for it in d:
        for k in ("name", "altnames"):
            v = it.get(k)
            if isinstance(v, str):
                out.add(norm(v))
            elif isinstance(v, list):
                out.update(norm(x) for x in v if isinstance(x, str))
    return {x for x in out if x}


def run():
    web = {}
    for name, fn in (("linguist", from_linguist), ("simple_icons", from_simple_icons),
                     ("devicon", from_devicon)):
        try:
            web[name] = fn()
        except Exception as e:
            web[name] = set()
            print(f"  {name} 실패 {type(e).__name__}: {e}")
        print(f"  {name:14} {len(web[name]):>6,}개")

    buckets = {
        "language": web["linguist"],
        "tool": web["simple_icons"] | web["devicon"],
        "concept": {norm(x) for x in CONCEPT},
        "domain": {norm(x) for x in DOMAIN},
        "certification": {norm(x) for x in CERTIFICATION},
        "office": {norm(x) for x in OFFICE},
    }
    for k in ("concept", "domain", "certification", "office"):
        print(f"  {'보완:' + k:14} {len(buckets[k]):>6,}개")

    # 우선순위대로 유형을 확정한다
    types = {}
    for t in TYPE_ORDER:
        for term in buckets[t]:
            if term and term not in types:
                types[term] = t

    dropped = {t for t in types if t in TOO_BROAD or t in NOT_SKILL or len(t) < 2}
    for t in dropped:
        types.pop(t, None)

    by_type = {}
    for term, t in types.items():
        by_type.setdefault(t, []).append(term)
    print(f"\n허용 어휘 {len(types):,}개 (포괄적·회사명으로 제외 {len(dropped)}개)")
    for t in TYPE_ORDER:
        print(f"   {t:14} {len(by_type.get(t, [])):>6,}")

    OUT.write_text(json.dumps({
        "generated_at": now_kst(),
        "note": "스킬 이름으로 인정할 어휘와 그 유형. 차단 목록이 아니라 허용 목록이다.",
        "sources": SRC,
        "licenses": {"linguist": "MIT", "simple_icons": "CC0", "devicon": "MIT",
                     "concept/domain/certification/office": "직접 작성"},
        "type_order": TYPE_ORDER,
        "map_types": ["language", "tool", "concept", "domain"],
        "aside_types": ["certification", "office"],
        "too_broad": sorted(TOO_BROAD),
        "not_skill": sorted(NOT_SKILL),
        "counts": {t: len(by_type.get(t, [])) for t in TYPE_ORDER},
        "types": dict(sorted(types.items())),
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {OUT.relative_to(RAW)}  {OUT.stat().st_size/1024:.0f}KB")


if __name__ == "__main__":
    run()
