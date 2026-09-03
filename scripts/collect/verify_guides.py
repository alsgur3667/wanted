"""직무 해설 글에서 스킬을 뽑고 **다른 출처와 대조해 검증**한다.

왜 문장 단위로 내려갔나
  처음에는 글 전체에 스킬 이름이 있으면 셌다. 원문을 읽어 보니 셋이 섞여 들어왔다.

    ① 네비게이션·푸터
       "Atlassian 제품 추천 … Jira 유연한 프로젝트 관리 Confluence 모든 지식을"
       → DevOps 글이 Jira·Datadog 을 요구하는 것처럼 잡혔다. 실제로는 사이트 메뉴였다.
    ② 다른 직무를 대조 설명하는 문단
       프론트엔드 글의 "백엔드 개발자는 … 흔히 사용하는 기술로는 Java, Python, Node.js"
       → 프론트엔드가 Python 을 요구하는 것으로 잡혔다.
    ③ 다의어
       마케팅 글의 "ROAS(광고 수익률), CPA(획득 비용) 같은 지표"
       → 광고 지표인데 사전의 CPA 는 회계사 자격증이다.

  그래서 문장으로 쪼갠 뒤 세 겹으로 거른다.

검증 기준 — 셋 중 하나라도 충족해야 인정한다
  ① 같은 직무의 채용공고에도 등장한다            (시장이 실제로 요구)
  ② 서로 다른 해설 글 2개 이상이 같은 말을 한다     (독립적으로 일치)
  ③ 공인 체계(O*NET·ESCO·NCS)에 그 직무 역량으로 있다

산출: data/raw/guides/verified.json
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW, word_pattern  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
GUIDES = RAW / "guides" / "guides.jsonl"
OUT = RAW / "guides" / "verified.json"

# ① 역량을 말하는 문장에만 나오는 단서.
#    네비게이션·푸터·제휴사 소개에는 이런 말이 없다.
CUE = re.compile(
    r"경험|역량|필요|필수|우대|자격|요구|활용|사용|다룰|다루|이해|능력|숙련|숙지|"
    r"스킬|기술|배우|학습|익히|공부|준비|갖추|알아야|할 수 있|가능하|능숙"
)

# ② 다른 직무를 말하는 문장은 그 직무의 요구로 세지 않는다.
#    글이 직무를 비교·대조하는 대목에서 생긴다.
ROLE_WORDS = {
    "be_dev": ["백엔드", "서버 개발"],
    "fe_dev": ["프론트엔드", "퍼블리셔"],
    "fullstack_dev": ["풀스택"],
    "mobile_dev": ["모바일 개발", "안드로이드", "iOS 개발"],
    "data_eng": ["데이터 엔지니어"],
    "data_scientist": ["데이터 사이언티스트", "머신러닝 엔지니어"],
    "data_analyst": ["데이터 분석가"],
    "devops_sre": ["데브옵스", "DevOps", "SRE", "인프라 엔지니어"],
    "security_eng": ["보안 엔지니어", "정보보안"],
    "qa_eng": ["QA", "테스터", "품질"],
    "product_manager": ["프로덕트 매니저", "PM", "서비스 기획"],
    "program_manager": ["프로젝트 매니저", "PMO"],
    "product_designer": ["프로덕트 디자이너", "UX 디자이너", "UI 디자이너"],
    "graphic_designer": ["그래픽 디자이너", "브랜드 디자이너"],
    "growth_marketing": ["그로스", "퍼포먼스 마케터", "마케터"],
    "biz_strategy": ["전략 기획", "사업 기획", "경영기획"],
    "architect": ["아키텍트"],
    "eng_lead": ["엔지니어링 매니저", "테크리드"],
}

# ③ 이 직무의 글에서는 이 스킬을 세지 않는다. 같은 철자, 다른 뜻이다.
AMBIGUOUS = {
    "growth_marketing": {"CPA"},        # 광고 지표 Cost Per Action ≠ 회계사 자격증
    "biz_strategy": {"CPA", "CFA"},     # 재무 지표 문맥에서 자격증으로 오인된다
    "product_designer": {"시스템 구축", "시스템 설계", "시스템 운영", "시스템 개발"},
    "graphic_designer": {"시스템 구축", "시스템 설계", "시스템 운영"},
    "devops_sre": {"UX/UI"},            # 별칭 "사용자 경험"이 잡았다.
    #  → "개발자는 …사용자 경험을 개선하는 데 에너지를 쏟을 수 있습니다" (DevOps 의 역량이 아니다)
    "data_eng": {"시스템 구축"},         # velog 개인 회고의 "파이프라인 구축" 서술이었다
    #  ↑ 전부 "디자인 시스템 구축/설계"다. IT 인프라의 시스템이 아니다.
}

# ④ 벤더 자사 글에서는 자사 제품을 세지 않는다.
#
# Atlassian 의 DevOps 해설 페이지에서 Jira·Confluence 가 끝내 걸러지지 않았다.
# 창을 좁히고 목록·되풀이·목차를 다 걸러도, 자사 제품명이 헤더·푸터·사이드바·본문 링크에
# 수십 번 박혀 있어 어딘가 한 창은 살아남는다. 규칙을 더 붙이는 것은 이 문서 한 건에 맞추는 일이다.
#
# 원칙으로 세우는 편이 낫다 — **파는 사람의 글은 자기 물건의 수요를 말하는 근거가 못 된다.**
# 다른 벤더 글(GitLab 블로그의 GitLab 등)에도 그대로 적용된다.
# 그 스킬이 진짜 필요하다면 남의 글이나 채용공고에서 다시 잡힌다.
VENDOR = {
    "atlassian.com": {"Jira", "Confluence", "Trello", "Bitbucket", "Loom", "Rovo",
                      "Jira Service Management", "Jira Align", "Statuspage"},
    "gitlab.com": {"GitLab"}, "github.com": {"GitHub"}, "datadoghq.com": {"Datadog"},
    "elastic.co": {"Elasticsearch", "Kibana"}, "figma.com": {"Figma"},
    "notion.so": {"Notion"}, "slack.com": {"Slack"}, "samsungsds.com": {"Brity"},
}


def vendor_products(url: str) -> set:
    for host, prods in VENDOR.items():
        if host in url:
            return prods
    return set()


SENT = re.compile(r"(?<=[.!?。])\s+|\n+|(?<=습니다)\s|(?<=해요)\s|(?<=이에요)\s|(?<=됩니다)\s")


def load_skills():
    S = json.loads((REPO / "data" / "skills.json").read_text(encoding="utf-8"))
    pats = {}
    for s in S:
        names = [s["name"]] + list(s.get("aliases") or [])
        pats[s["id"]] = [word_pattern(n) for n in names if n]
    return S, pats


WINDOW = 140          # 스킬 언급 좌우로 볼 글자 수

# ── 배제 ① 사이트 메뉴·자습서 목록 ──────────────────────────────────
# 원문을 읽어 확인한 실패 사례(Atlassian DevOps 문서):
#   "Jira 유연한 프로젝트 관리 Confluence 모든 지식을 한곳에 보관 Trello 작업 캡처…"
#   "Jira Dynatrace 통합 자습서 Jira Dynatrace 이슈 자습서 Jira 및 Datadog 통합…"
# 단어 자체는 '관리·활용' 같은 단서를 품고 있어 단서 검사만으로는 걸리지 않는다.
# 메뉴·목록의 진짜 특징은 **같은 구절이 창 안에서 되풀이된다**는 것이다. 본문은 그러지 않는다.
NAV_HINT = re.compile(r"메뉴|바로가기|건너뛰기|로그인|회원가입|고객센터|이용약관|"
                      r"개인정보처리방침|모든 앱|제품 추천|Open main menu|Search posts")
# 광고·제휴 문구. "구글, 마이크로소프트, AWS 등과 협력하여 콘텐츠를 개발한다"가
# 그래픽 디자이너 글에서 AWS 를 요구 스킬로 만들었다.
# 광고·제휴·자사 서비스 소개, 그리고 블로그 글 끝의 **추천 콘텐츠 위젯**.
# 원문에서 확인한 것들:
#   "구글, 마이크로소프트, AWS 등과 협력하여 콘텐츠를 개발한다"        → 그래픽 디자이너 글의 AWS
#   "데이터 관리 콘텐츠 Best 3 ▶ [MongoDB란?] … ▶ GraphQL이란? …"  → UX 리서처 글의 MongoDB·Kafka
#   "그래서 이랜서는 … 매칭 합니다. ERP, SAP, RPA 전문가부터"        → QA 글의 ERP·SAP
# 셋 다 글쓴이가 '이 직무에 필요하다'고 말한 것이 아니다.
PROMO = re.compile(r"협력하여|제휴|수강|커리큘럼 확인|얼리버드|할인|쿠폰|무료 체험|"
                   r"코스를 완료|certificate|바로 신청|"
                   r"콘텐츠 Best|인기 콘텐츠|함께 보면|관련 글|추천 콘텐츠|▶|"
                   r"No\.1|매칭 합니다|매칭합니다|전문가부터")
# 되풀이 비율 — 목록은 같은 구절을 여러 번 싣는다.
# 임계값은 눈대중이 아니라 실측해서 잡았다. 확인한 창에서
#   목록(Atlassian 자습서 색인)  0.042
#   산문("DevOps 엔지니어는 …"이 두 번 나오는 진짜 서술)  0.014 이하
# 산문도 주어를 되풀이하므로 0 으로 두면 진짜 서술이 함께 죽는다.
NGRAM, REPEAT_MAX = 14, 0.025
# 문서 목차 — "테스트 개요 … 보안 개요 … 가시성 개요"처럼 한 창에 목차어가 여럿이면 색인이다.
# 산문에도 '개요'가 한 번은 나올 수 있어 2회 이상일 때만 본다.
TOC = re.compile(r"개요|알아보기|살펴보기")
# 되풀이로도 안 잡히는 사이트 문구. 전부 원문에서 확인하고 넣었다.
#   푸터  "…자세히 알아보기 무료로 시작하기 회사 채용 정보 이벤트 블로그 투자 정보 …
#          제품 Rovo Jira Jira Align Confluence Loom Trello 모든 제품 보기 …"
#   목록  "Xray를 사용하여 Jira에서 자동화된 테스트 / Jira 및 Zephyr에서 진행률을 추적"
# 본문 서술에는 이런 말이 오지 않는다.
CHROME = re.compile(r"자세히 알아보기|무료로 시작하기|모든 제품 보기|보도 자료|투자 정보|"
                    r"티켓 제출|기술 자료|Marketplace|자습서|튜토리얼|내 계정")


def repeated(win: str) -> bool:
    seen, hit = set(), 0
    for i in range(len(win) - NGRAM):
        g = win[i:i + NGRAM]
        if not g.strip():
            continue
        if g in seen:
            hit += 1
        seen.add(g)
    return hit / max(1, len(win)) > REPEAT_MAX


def nearest_role(win: str, at: int, job: str):
    """창 안에서 언급 지점에 **가장 가까운** 직무어가 어느 직무인지.

    "이 직무 단어가 하나라도 있으면 통과" 로 두었더니 새어 나왔다.
    프론트엔드 글의 백엔드 소개 문단은 "백엔드 개발자는 … Java, Python" 바로 뒤에
    "풀스택 개발자는 프론트엔드와 백엔드를 …" 가 이어져, 창 안에 두 직무어가 함께 있었다.
    그래서 **거리**로 판단한다. 언급에 붙어 있는 직무가 그 문단의 주인이다.
    """
    best, best_d = None, 10**9
    for j, words in ROLE_WORDS.items():
        for w in words:
            k = 0
            while True:
                k = win.find(w, k)
                if k < 0:
                    break
                d = 0 if k <= at <= k + len(w) else min(abs(at - k), abs(at - k - len(w)))
                if d < best_d:
                    best, best_d = j, d
                k += 1
    return best


def judge(text: str, m: re.Match, job: str):
    """이 언급이 '이 직무에 필요한 것'을 말하는가.

    문장 단위로 쪼개는 방식은 실패했다. 네비게이션·푸터는 마침표가 없어
    통째로 한 덩어리가 되고, 그 안에 단서 한 개만 있으면 통과해 버린다.
    그래서 **언급 지점 좌우 창**만 보고 판단한다.
    """
    a = max(0, m.start() - WINDOW)
    b = min(len(text), m.end() + WINDOW)
    win = text[a:b]

    if (NAV_HINT.search(win) or CHROME.search(win) or repeated(win)
            or len(TOC.findall(win)) >= 2):
        return None, "nav"            # 사이트 메뉴·자습서 목록
    if PROMO.search(win):
        return None, "promo"          # 강의 광고·제휴사 소개
    if not CUE.search(win):
        return None, "cue"            # 역량을 말하는 대목이 아니다

    owner = nearest_role(win, m.start() - a, job)
    if owner is not None and owner != job:
        return None, "role"           # 가장 가까운 직무어가 다른 직무다
    return win, None


def run():
    S, pats = load_skills()
    by_id = {s["id"]: s for s in S}
    matrix = json.loads((REPO / "data" / "job-skills.json").read_text(encoding="utf-8"))
    jd_pairs = {(m["jobId"], m["skillId"]): m for m in matrix}
    jobs = {j["id"]: j for j in json.loads((REPO / "data" / "jobs.json").read_text(encoding="utf-8"))}

    guides = [json.loads(l) for l in GUIDES.open(encoding="utf-8") if l.strip()]
    print(f"해설 글 {len(guides)}건 · 스킬 사전 {len(S)}개\n")

    hits = defaultdict(lambda: defaultdict(set))
    drop = Counter()
    for g in guides:
        banned = AMBIGUOUS.get(g["job_id"], set()) | vendor_products(g["url"])
        txt = g["text"]
        for sid, ps in pats.items():
            if by_id[sid]["name"] in banned:
                drop["ambiguous"] += 1
                continue
            ok = False
            for p in ps:
                for m in p.finditer(txt):
                    win, why = judge(txt, m, g["job_id"])
                    if win:
                        ok = True
                        break
                    drop[why] += 1
                if ok:
                    break
            if ok:
                hits[g["job_id"]][sid].add(g["url"])
    print(f"언급 배제 — 사이트메뉴 {drop['nav']:,} · 역량 단서 없음 {drop['cue']:,} · "
          f"다른 직무 얘기 {drop['role']:,} · 광고 {drop['promo']:,} · 다의어 {drop['ambiguous']:,}")

    rows, tally = [], Counter()
    for job, sk in hits.items():
        n_docs = sum(1 for g in guides if g["job_id"] == job)
        for sid, urls in sk.items():
            in_jd = (job, sid) in jd_pairs
            multi = len(urls) >= 2
            onto = bool(by_id[sid].get("ontology_sources"))
            if in_jd:
                grade, why = "confirmed", "같은 직무의 채용공고에도 등장"
            elif multi:
                grade, why = "corroborated", f"해설 글 {len(urls)}건이 독립적으로 언급"
            elif onto:
                grade, why = "corroborated", "공인 역량 체계에 등재"
            else:
                grade, why = "unverified", "해설 글 1건에서만 언급"
            tally[grade] += 1
            rows.append({
                "jobId": job, "skillId": sid, "skill": by_id[sid]["name"],
                "guideMentions": len(urls), "guideDocs": n_docs,
                "verification": grade, "reason": why, "inJobPostings": in_jd,
                "jdWeight": jd_pairs.get((job, sid), {}).get("weight"),
                "sources": sorted(urls),
            })

    rows.sort(key=lambda r: (r["jobId"], -r["guideMentions"]))
    OUT.write_text(json.dumps({
        "note": "해설 글에서 뽑은 직무별 스킬 언급. 문장 단위로 거른 뒤 다른 출처와 대조했다.",
        "filters": ["역량 단서가 있는 문장만", "다른 직무를 설명하는 문장 제외", "직무별 다의어 제외", "벤더 자사 글의 자사 제품 제외"],
        "grades": {
            "confirmed": "같은 직무의 채용공고에도 등장 — 시장이 실제로 요구한다",
            "corroborated": "해설 글 2건 이상이 일치하거나 공인 체계에 등재 — 업계 통념",
            "unverified": "해설 글 1건에서만 — 개인 의견일 수 있다",
        },
        "guide_count": len(guides), "counts": dict(tally), "rows": rows,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n검증 결과 {dict(tally)}")
    for job in sorted(hits):
        rs = [r for r in rows if r["jobId"] == job]
        print(f"\n  ── {jobs.get(job, {}).get('title', job)}  (글 {rs[0]['guideDocs']}건)")
        for grade in ("confirmed", "corroborated", "unverified"):
            names = [r["skill"] for r in rs if r["verification"] == grade][:12]
            if names:
                print(f"     [{grade}] " + " · ".join(names))
    print(f"\n→ {OUT.relative_to(RAW)}")


if __name__ == "__main__":
    run()
