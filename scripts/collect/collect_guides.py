"""직무 해설 글 수집 — 공고가 못 주는 것을 메운다.

왜 필요한가
  채용공고는 **그 회사가 지금 원하는 것**만 적는다. 게다가 우리 민간 공고의 62%가 시니어라
  요구 스킬이 5년차 기준으로 잡힌다. 신입에게 필요한 것이 무엇인지는 공고에 잘 안 적힌다.

  반면 현직자·교육기관이 쓴 직무 해설은 애초에 **입문자를 대상으로** 쓰였고,
  "이 직무에는 일반적으로 무엇이 필요한가"를 정리한다. 공고와 성격이 다르다.

⚠️ 원문은 커밋하지 않는다
  블로그 글은 저작물이다. 원문은 data/raw/ 에만 두고, 저장소에는
  "어떤 스킬이 몇 번 언급됐는가"라는 **집계 수치**만 올린다. 사실의 추출이지 표현의 이용이 아니다.
  출처 URL 은 전 건 기록해 확인할 수 있게 한다.

⚠️ 검증 없이 쓰지 않는다
  블로그는 개인 의견이고 공고는 실제 수요다. 같은 무게로 섞으면 안 된다.
  여기서는 언급을 세기만 하고, verify_guides.py 가 다른 출처와 대조해 확인된 것만 남긴다.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import polite_get, robots_allowed, RAW, now_kst, sha256  # noqa: E402

OUT = RAW / "guides"
TAG = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)
STRIP = re.compile(r"<[^>]+>")
WS = re.compile(r"[ \t\xa0]+")

# 직무 → 해설 글 URL. 검색으로 찾은 것을 사람이 확인해 넣는다.
# 자료가 얇은 직군(기획·디자인·데이터)부터 채운다.
SOURCES = {
    "be_dev": [
        "https://sprint.codeit.kr/blog/2025-spring-백엔드-취업-로드맵",
        "https://kernel.fastcampus.co.kr/insight_BEstudy",
        "https://www.codestates.com/blog/content/백엔드-개발자-로드맵",
        "https://spartaclub.kr/blog/2024-backend-roadmap",
        "https://fastcampus.co.kr/story_article_keh",
        "https://brunch.co.kr/@13335218e68a4e8/99",
        "https://www.inflearn.com/roadmaps/11415",
        "https://www.codestates.com/blog/content/개발자-역량",
    ],
    "fe_dev": [
        "https://fastcampus.co.kr/meida_dev_frontend",
        "https://brunch.co.kr/@likelion/131",
        "https://fastcampus.co.kr/impact_all_frontend",
        "https://velog.io/@skyu_dev/나만의-로드맵-더-나은-프론트엔드-개발자가-되기-위한-학습-방향-설정하기",
    ],
    "devops_sre": [
        "https://velog.io/@rlemdhs612/DevOps-엔지니어-로드맵",
        "https://velog.io/@dojun527/DevOps-엔지니어",
        "https://insight.infograb.net/blog/2023/11/06/how-to-be-a-devops-engineer/",
        "https://www.samsungsds.com/kr/insights/devops-sre-platform-engineering.html",
        "https://www.atlassian.com/ko/devops/what-is-devops/devops-engineer",
        "https://www.elancer.co.kr/blog/detail/843",
        "https://www.infograb.net/9889b608-678e-465f-9fb5-68df62aea115",
    ],
    "data_eng": [
        "https://brunch.co.kr/@sparkplus/469",
        "https://www.inflearn.com/roadmaps/9493",
        "https://velog.io/@invidam/data-engineering-beginner",
        "https://prime-career.com/interview_article/4659",
    ],
    "data_analyst": [
        "https://zzsza.github.io/diary/2021/02/21/various-data-jobs/",
        "https://community.heartcount.io/ko/ai-data-analyst-skill/",
        "https://datarian.io/blog/dataanalyst-skill",
        "https://tilnote.io/en/pages/6a930625ace8bd2da70d85b0",
        "https://velog.io/@soy77440/데이터-분석가가-갖춰야-할-9가지-역량",
        "https://velog.io/@sws7884/데이터-분석가에게-필요한-역량",
    ],
    "security_eng": [
        "https://www.itworld.co.kr/news/219879",
        "https://brunch.co.kr/@rooot/76",
        "https://theori.io/ko/blog/cybersecurity-job-preparation-guide",
        "https://www.ciokorea.com/news/39410",
        "https://www.cio.com/article/4197569/최고의-보안-엔지니어는-무엇이-다른가ai-시대-필수.html",
    ],
    "qa_eng": [
        "https://brunch.co.kr/@jamescompany/18",
        "https://tech.socarcorp.kr/qa/2023/05/15/qa-skills-marktang.html",
        "https://www.cio.com/article/3505291/qa에서-진화된-ai-시대-필수-인력-it-자동화-엔지니어.html",
        "https://www.elancer.co.kr/blog/detail/300",
        "https://medium.com/musinsa-tech/qaengineer-roles-and-responsibilities-d1fc088c7a43",
        "https://sprint.codeit.kr/blog/유저의-불편함이-프로덕트로-qa-직무-완전-분석-qa-업무-역량-연봉까지",
        "https://careerly.co.kr/qnas/10253",
    ],
    "product_manager": [
        "https://billionnapkin.com/service-planner-guide/",
        "https://www.codestates.com/blog/content/신입-기획자-포트폴리오",
        "https://brunch.co.kr/@yunheh/12",
        "https://brunch.co.kr/@fromjayden/11",
        "https://blog.gridge.co.kr/project-manager/",
        "https://www.codestates.com/blog/content/pm-되는법",
        "https://velog.io/@plannerrr/PM에-대해-알아보자-2",
    ],
    "product_designer": [
        "https://www.elancer.co.kr/blog/detail/789",
        "https://treeup.io/career-guide/ux-researcher",
        "https://blog.hwahae.co.kr/all/tech/12726",
        "https://mag.surfit.io/product-designer-guide/",
        "https://mag.surfit.io/becoming-ux-ui-designer/",
        "https://brunch.co.kr/@13335218e68a4e8/110",
        "https://brunch.co.kr/@2aec535615f24be/14",
    ],
    "graphic_designer": [
        "https://brunch.co.kr/@2aec535615f24be/5",
        "https://jobcannon.io/ko/careers/brand-designer",
        "https://ko.wix.com/blog/post/graphic-design-websites-inspiration",
        "https://media.fastcampus.co.kr/insight/design/designpp/",
        "https://brunch.co.kr/@outlines/5",
        "https://www.itdaa.net/open_mentorings/2470",
    ],
    "growth_marketing": [
        "https://www.codestates.com/blog/content/퍼포먼스-마케터란",
        "https://www.mobiinside.co.kr/2022/02/17/bigquery/",
        "https://brunch.co.kr/@likelion/133",
        "https://brunch.co.kr/@groschool/80",
        "https://brunch.co.kr/@edte1020/69",
        "https://www.openads.co.kr/content/contentDetail?contsId=7599",
        "https://1point.kr/blog/insights/growth-performance-difference/",
    ],
    "biz_strategy": [
        "https://jasoseol.com/blog/post/30/",
        "https://brunch.co.kr/@13335218e68a4e8/102",
        "https://jasoseol.com/blog/post/직무-분석-경영기획-전략-뜻-하는일-자격증-사업기획/",
        "https://inthiswork.com/strategy",
        "https://lifeupstory.com/경영기획-직무-분석-총정리/",
    ],
    "mobile_dev": [
        "https://www.elancer.co.kr/blog/detail/917",
        "https://brunch.co.kr/@nexdigm01/16",
        "https://nbcamp.spartacodingclub.kr/blog/-%EC%A7%81%EC%97%85%EC%9D%98-%EC%84%B8%EA%B3%84-%EC%95%B1-%EA%B0%9C%EB%B0%9C-%E2%91%A0-%EB%AC%B4%EC%8A%A8-%EC%9D%BC%EC%9D%84-%ED%95%98%EB%82%98%EC%9A%94-47012",
    ],
    "data_scientist": [
        "https://brunch.co.kr/@sparta/118",
        "https://velog.io/@howard_marks/데이터-사이언티스트란",
        "https://velog.io/@howard_marks/다양한-데이터-사이언스-직무들",
        "https://www.codestates.com/blog/content/데이터-사이언티스트가-하는-일은",
        "https://www.codestates.com/blog/content/데이터-사이언티스트가-하는-일",
        "https://github.com/Team-Neighborhood/I-want-to-study-Data-Science/wiki/머신러닝-엔지니어",
        "https://www.gttkorea.com/news/articleView.html?idxno=7902",
    ],
    "fullstack_dev": [
        "https://velog.io/@k-dino/풀스택-개발자-학습-로드맵",
        "https://sprint.codeit.kr/blog/2025-js-웹-풀스택-취업-로드맵",
        "https://blog.goorm.io/fullstack/",
        "https://sprint.codeit.kr/blog/fullstack-developer-job-skills",
        "https://codecrain.medium.com/코드크레인-수요-높은-박학다능-풀스택-개발자란-되는-방법은-b379e134c7b4",
    ],
    "program_manager": [
        "https://brunch.co.kr/@moq/16",
        "https://www.elancer.co.kr/blog/detail/68",
        "https://velog.io/@pgby/PMBOK-3-프로젝트-관리자-역할",
        "https://freemoa-blog.com/1016",
        "https://brunch.co.kr/@acc9b16b9f0f430/50",
        "https://ko.wikipedia.org/wiki/프로젝트_관리_전문가",
    ],
    "embedded_dev": [
        "https://kldp.org/node/164823",
        "https://job.asamaru.net/직무/임베디드sw엔지니어링/",
        "https://codedosa.com/1715",
        "https://velog.io/@mythos/EETB-1-임베디드-소프트웨어-엔지니어의-업무",
        "https://kldp.org/node/163651",
        "https://community.linkareer.com/STEM_mentoring/4699573",
    ],
    "architect": [
        "https://velog.io/@tedigom/MSA-제대로-이해하기-2-MSA-Outer-Architecure",
        "https://velog.io/@momona/msa01",
        "https://www.samsungsds.com/kr/insights/1239180_4627.html",
        "https://whdrns2013.github.io/design_pattern/20250708_001_msa/",
        "https://velog.io/@willie/소프트웨어-아키텍트",
        "https://velog.io/@jihwankim94/소프트웨어-아키텍처란-무엇인가",
        "https://velog.io/@bouml3/개발-vs-아키텍처",
        "https://giljae.com/2022/10/05/소프트웨어-아키텍트의-역할.html",
        "https://zdnet.co.kr/view/?no=20170810153934",
    ],
    "eng_lead": [
        "https://maily.so/devpill/posts/w6ovygdpok5",
        "https://maily.so/devpill/posts/5xrxklklo2v",
        "https://jinu.substack.com/p/13",
        "https://brunch.co.kr/@evanyunkeelee/3",
        "https://blog.banksalad.com/tech/engineering-manager-role-growth/",
        "https://velog.io/@broccolism/개발자-커리어-단계별-역량-차이",
        "https://dev-jinsukiya.medium.com/테크리드가-해야-하는-일-af12bd0bd2a1",
        "https://velog.io/@whaleshark/3장.-테크리드",
    ],
    "solutions_eng": [
        "https://www.onlybook.co.kr/entry/presales",
        "https://okky.kr/articles/472665",
        "https://brunch.co.kr/@imagineer/328",
        "https://ko.wikipedia.org/wiki/세일즈_엔지니어링",
    ],
    "biz_analyst": [
        "https://brunch.co.kr/@hyunda/33",
        "https://www.cio.com/article/3519904/직무-책임-연봉으로-알아보는-비즈니스-분석가.html",
        "http://www.edujin.co.kr/news/articleView.html?idxno=41510",
        "https://zzsza.github.io/diary/2021/02/21/various-data-jobs/",
        "https://community.heartcount.io/ko/ai-data-analyst-skill/",
    ],
    "designer": [
        "https://velog.io/@ivermatin/내가-생각하는-UIUX-디자이너의-핵심-역량",
        "https://nbcamp.spartaclub.kr/blog/-직업의-세계-uiux-디자이너-③-uiux-디자이너의-현실-41245",
        "https://exitbasic.com/웹디자이너/",
        "https://ko.wix.com/blog/post/ux-design-tools",
        "https://brunch.co.kr/@13335218e68a4e8/93",
        "https://brunch.co.kr/@2aec535615f24be/14",
    ],
    "sw_eng": [
        "https://velog.io/@yeonbikim/1-개발자로-취업하기-위해-컴퓨터-과학CS지식은-왜-중요한가",
        "https://velog.io/@1w2k/cs-과목-길잡이",
        "https://velog.io/@yjj7819/백엔드-신입-개발자가-쌓아야-하는-역량-자료구조-알고리즘-코딩-테스트",
        "https://velog.io/@harry7435/자료구조-알고리즘-중요한-이유",
    ],
    "motion_designer": [
        "https://jobcannon.io/careers/motion-graphics-designer",
        "https://prime-career.com/interview_article/6691",
    ],
}


def text_of(html: str) -> str:
    s = TAG.sub(" ", html)
    s = STRIP.sub(" ", s)
    s = WS.sub(" ", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    rows, skipped = [], []
    for job, urls in SOURCES.items():
        for url in urls:
            if not robots_allowed(url):
                skipped.append((url, "robots.txt 불허"))
                continue
            try:
                r = polite_get(url, timeout=30)
            except Exception as e:
                skipped.append((url, type(e).__name__))
                continue
            if r.status_code != 200:
                skipped.append((url, f"HTTP {r.status_code}"))
                continue
            body = text_of(r.text)
            ko = sum(1 for c in body if "가" <= c <= "힣")
            if ko < 300:
                skipped.append((url, f"한글 {ko}자 — 본문 추출 실패"))
                continue
            rows.append({
                "job_id": job, "url": url, "collected_at": now_kst(),
                "hangul": ko, "length": len(body),
                "sha256": sha256(body), "text": body[:40000],
            })
            print(f"  {job:18} 한글 {ko:>6,}자  {url[:58]}")

    (OUT / "guides.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8")
    print(f"\n수집 {len(rows)}건 → guides/guides.jsonl")
    if skipped:
        print(f"제외 {len(skipped)}건")
        for u, why in skipped:
            print(f"   {why:26} {u[:62]}")


if __name__ == "__main__":
    run()