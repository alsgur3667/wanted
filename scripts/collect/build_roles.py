"""직무(역할) → 실제 요구 스킬 — 공고 제목에서 역할을 뽑고, 그 공고들의 스킬을 모은다.

왜 다시 만드나
  앞서 NCS 직무 175개를 노드로 삼아 역량 겹침으로 인접도를 계산하려다 실패했다.
  NCS 역량 표현의 95%가 단 하나의 직무에만 나온다 — 공유 어휘가 아니라
  능력단위마다 새로 쓴 서술문이라서 겹칠 수가 없다. 직무 쌍의 공유 역량 중앙값이 0이었다.

  여기서는 **공유 어휘가 있는 것**을 쓴다.
    노드   = 공고 제목에서 뽑은 역할 (Backend Engineer, 프로덕트 디자이너 …)
    어휘   = 이미 채굴한 스킬 사전 (_skills.json)
    인접도 = 역할이 요구하는 스킬 집합의 겹침
  근거를 댈 수 있다 — "이 두 역할은 공고에서 SQL·Python 을 함께 요구합니다".

  공공기관 공고는 제외한다. 제목이 '2026년 하반기 일반직 채용공고' 형태라
  직무명으로 쓸 수 없다(본문은 스킬 사전 만들 때 이미 썼다).

산출: data/raw/_roles.json
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW, word_pattern  # noqa: E402

OUT = RAW / "_roles.json"
MIN_POSTS = 5          # 공고가 이보다 적은 역할은 통계가 의미 없다
MIN_SKILL_DF = 0.05    # 역할 공고의 5% 이상에 나오면 요구 스킬로 본다.
#                        0.15 로 두면 MySQL·Redis·C#·Django 처럼 특정 역할에서만
#                        5~15% 나오는 실제 스킬이 어느 직무에도 안 붙어 고아가 된다.
#                        상한은 두지 않는다 — 데이터는 다 주고 표시할 개수는 앱이 정한다.
#                        계약의 weight>=0.6 필수 / 0.3~0.6 우대 규칙이 이미 필터 역할을 한다.
MIN_LIFT = 1.2         # 전체 평균 대비 배수. 이 이상이면 그 역할의 특징으로 본다.
#                        1.5 로 두면 23개 역할 중 5개가 직군 교차 이웃을 잃어
#                        '이 길도 있어요'를 줄 수 없게 된다. 1.2 에서 고립이 0 이 된다.
#                        가중 자카드(lift 를 가중치로)도 시험했는데 더 나빴다 —
#                        공유하지 않는 특화 스킬의 큰 lift 가 분모를 지배해
#                        고립이 15개로 늘었다. 이분법이 이 데이터에는 맞다.
TOP_K = 8

# 세 직군 밖의 역할. 제일 먼저 걸러낸다 — 안 그러면 'engineer'·'manager' 같은
# 포괄 규칙에 영업·인사·재무 공고가 딸려 들어온다.
NOT_TARGET = [
    "account executive", "sales manager", "sales representative", "vertrieb",
    "recruiter", "talent acquisition", "human resources", "buchhalt", "accountant",
    "legal counsel", "office assistant", "office manager", "content reviewer",
    "customer support", "customer success", "kundenservice", "praxis onboarding",
    "consulting architect", "steuerberat", "pflege", "techniker bau",
]

# 역할 사전 — (표준 역할명, 직군, 제목에서 찾을 표현들)
# 앞선 것부터 먼저 맞춰본다. **좁은 것을 위에** 둔다.
# Arbeitnow 가 독일 공고라 독일어 표현도 함께 넣는다(전체의 45%).
ROLES = [
    ("데이터 엔지니어",   "개발", ["data engineer", "데이터 엔지니어", "data platform engineer"]),
    ("데이터 사이언티스트", "개발", ["data scientist", "데이터 사이언티스트", "machine learning engineer",
                              "ml engineer", "ai engineer", "머신러닝"]),
    ("데이터 분석가",     "개발", ["data analyst", "데이터 분석", "analytics engineer",
                              "business intelligence", "bi analyst"]),
    ("백엔드 개발자",     "개발", ["backend", "back-end", "back end", "서버 개발", "백엔드"]),
    ("프론트엔드 개발자",  "개발", ["frontend", "front-end", "front end", "프론트엔드", "웹 퍼블리"]),
    ("모바일 개발자",     "개발", ["android", "ios developer", "ios engineer", "mobile engineer",
                              "mobile developer", "안드로이드", "모바일 개발"]),
    ("DevOps·SRE",     "개발", ["devops", "site reliability", "sre", "infrastructure engineer",
                              "platform engineer", "cloud engineer", "인프라"]),
    ("보안 엔지니어",     "개발", ["security engineer", "security analyst", "penetration",
                              "information security", "보안"]),
    ("QA 엔지니어",      "개발", ["qa engineer", "quality assurance", "test engineer", "sdet", "품질"]),
    ("임베디드·펌웨어",    "개발", ["embedded", "firmware", "임베디드", "펌웨어", "hardware engineer"]),
    ("게임 개발자",      "개발", ["game developer", "game engineer", "game programmer",
                             "unity", "unreal", "게임 개발", "게임 클라이언트", "게임 서버"]),
    ("풀스택 개발자",     "개발", ["full stack", "fullstack", "full-stack", "풀스택"]),
    ("아키텍트",        "개발", ["architect", "아키텍트", "architekt"]),
    ("솔루션·세일즈 엔지니어", "개발", ["solutions engineer", "solution engineer", "sales engineer",
                               "forward deployed", "presales", "pre-sales",
                               "solutions consultant", "솔루션 엔지니어"]),
    ("IT 지원·헬프데스크",  "개발", ["service desk", "help desk", "helpdesk", "it support",
                              "technical support", "desktop support", "it operations",
                              "시스템 운영", "기술지원"]),
    ("엔지니어링 리더",    "개발", ["engineering manager", "engineering director", "head of engineering",
                             "principal engineer", "staff engineer", "technical lead",
                             "tech lead", "vp engineering", "chief technology",
                             "member of technical staff", "테크리드", "개발팀장"]),
    ("소프트웨어 엔지니어", "개발", ["software engineer", "software developer", "소프트웨어 엔지니어",
                              "softwareentwickl", "entwickler", "개발자", "engineer",
                              "developer", "programmer", "entwicklung"]),
    ("프로덕트 디자이너",  "디자인", ["product designer", "프로덕트 디자이너", "ux designer",
                              "ui designer", "ui/ux", "ux/ui", "service designer"]),
    ("그래픽·브랜드 디자이너", "디자인", ["graphic designer", "brand designer", "visual designer",
                                "그래픽 디자이너", "브랜드 디자이너", "비주얼"]),
    ("모션·영상 디자이너",  "디자인", ["motion designer", "video editor", "animator", "3d artist",
                              "모션", "영상", "멀티미디어"]),
    ("UX 리서처",       "디자인", ["ux researcher", "user researcher", "리서처"]),
    ("디자이너(일반)",    "디자인", ["designer", "디자이너", "design"]),
    ("프로덕트 매니저",   "기획", ["product manager", "product owner", "프로덕트 매니저",
                              "서비스 기획", "prd", "po "]),
    ("프로젝트·프로그램 매니저", "기획", ["project manager", "program manager", "pmo",
                                 "프로젝트 매니저", "프로그램 매니저"]),
    ("사업·전략 기획",    "기획", ["strategy", "business development", "사업 기획", "전략 기획",
                              "사업기획", "전략기획", "사업 개발"]),
    ("데이터·비즈니스 기획", "기획", ["business analyst", "비즈니스 분석", "경영 기획", "경영기획"]),
    ("마케팅·그로스",     "기획", ["growth", "marketing", "performance marketing", "brand manager",
                              "communications", "kommunikation", "마케팅", "그로스", "홍보"]),
]


# ── 연차 판정 ──────────────────────────────────────────────────────────
# 민간 공고 1,200건 중 절반이 시니어다(제목에 Senior·Staff·Lead). 본문의 경력 요구도
# 중앙 5년이다. 그대로 집계하면 요구 스킬이 전부 '5년차 기준'이 되고,
# Route.gapSkills 가 실제보다 무겁게 나온다 — 전환의 문턱을 높여 보이게 만든다.
# 그래서 같은 직무라도 연차를 나눠 따로 센다.
SENIOR_TITLE = re.compile(
    r"senior|sr\.|staff|principal|lead|head of|director|architect|manager|"
    r"시니어|팀장|리드|수석|책임|총괄", re.I)
ENTRY_TITLE = re.compile(
    r"junior|jr\.|entry|graduate|intern|working student|werkstudent|associate|"
    r"신입|주니어|인턴|경력무관|신입/경력", re.I)
YEARS = re.compile(r"(\d{1,2})\s*\+?\s*(?:years?|년)\s*(?:of\s+)?(?:experience|경력|이상)", re.I)


def seniority(d: dict) -> str:
    """senior | entry — 제목 표현을 먼저 보고, 없으면 본문의 경력 연수를 본다.

    entry 는 '신입'만이 아니라 **시니어가 아닌 것 전부**다. 주니어 표기가 4%뿐이라
    따로 떼면 표본이 무너진다. 연차를 명시하지 않은 공고는 신입도 지원할 수 있다고 본다.
    """
    t = d["title"]
    if ENTRY_TITLE.search(t):
        return "entry"
    if SENIOR_TITLE.search(t):
        return "senior"
    yrs = [int(m.group(1)) for m in YEARS.finditer(d["text"][:4000])]
    yrs = [y for y in yrs if 0 < y <= 20]
    if yrs and min(yrs) >= 4:
        return "senior"
    return "entry"


def role_of(title: str):
    low = title.lower()
    if any(p in low for p in NOT_TARGET):
        return None, None
    for name, fam, pats in ROLES:
        if any(p in low for p in pats):
            return name, fam
    return None, None


def run():
    skills = json.loads((RAW / "_skills.json").read_text(encoding="utf-8"))["skills"]
    sk_by_key = {s["key"]: s for s in skills}
    keys = set(sk_by_key)
    key_name = {k: v["name"] for k, v in sk_by_key.items()}   # 매칭은 정규 표기로 한다

    # 역할별로 공고를 모은다 (민간 공고만 — 공공기관 제목은 직무명이 아니다)
    posts = defaultdict(list)
    fam_of = {}
    skipped = 0
    total_private = 0

    with (RAW / "_corpus.jsonl").open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            if d["source"].startswith("data.go.kr"):
                continue
            total_private += 1
            name, fam = role_of(d["title"])
            if not name:
                skipped += 1
                continue
            fam_of[name] = fam
            posts[name].append(d)

    print(f"민간 공고 {total_private:,}건 · 역할 배정 {total_private - skipped:,} · 미분류 {skipped:,}")

    # ⚠️ 스킬을 셀 때 부분문자열로 찾으면 안 된다.
    #    `if "unity" in text` 는 opportunity·community 에도 걸린다. 실제로 이 실수로
    #    Unity 가 14건이 아니라 493건으로 집계됐다 — 97%가 오탐이었다.
    #    scalable→Scala, location→OCA, storage→RAG, enterprise→ERP 도 같은 원인이다.
    #
    #    앞은 영문·숫자·한글 모두 막는다. '빅데이터 분석' 안의 '데이터 분석'을 세지 않기 위해서다.
    #    뒤는 영문·숫자만 막는다. 한글 조사(분석을·개발이)가 붙는 것은 정상 등장이다.
    #    대소문자는 구분한다 — 사전이 이미 대문자 사용 비율로 걸러졌는데
    #    re.I 를 쓰면 그 판단이 무효가 된다 (소문자 sass 가 Sass 로 20건 오탐).
    pat = {k: word_pattern(nm) for k, nm in key_name.items()}

    counted = {}
    seniority_n = {}
    for name, docs in posts.items():
        if len(docs) < MIN_POSTS:
            continue
        cnt, pref_cnt = Counter(), Counter()
        by_sen = {"senior": Counter(), "entry": Counter()}
        n_sen = Counter()
        for d in docs:
            blob = f"{d['title']} {d['text']}"
            pref = d.get("pref_text", "")
            lv = seniority(d)
            n_sen[lv] += 1
            for k in keys:
                if pat[k].search(blob):
                    cnt[k] += 1
                    by_sen[lv][k] += 1
                    if pat[k].search(pref):
                        pref_cnt[k] += 1
        counted[name] = (cnt, pref_cnt, len(docs), by_sen)
        seniority_n[name] = dict(n_sen)

    # 전체 평균 등장률 — lift 의 분모
    overall = Counter()
    total_posts = sum(v[2] for v in counted.values())
    for v in counted.values():
        overall.update(v[0])

    # 역할별 요구 스킬.
    #   share 만 쓰면 AI·IT·API 처럼 어느 공고에나 있는 말이 상위를 채우고,
    #   그 결과 모든 역할이 서로 비슷해진다(소프트웨어 엔지니어↔프로덕트 매니저 자카드 0.85).
    #   그래서 lift = (이 역할의 등장률) / (전체 평균 등장률) 을 함께 본다.
    #   lift 가 1 보다 크면 '이 역할에서 유난히 많이 요구되는' 스킬이다.
    roles = []
    for name, (cnt, pref_cnt, n, by_sen) in sorted(counted.items(), key=lambda x: -x[1][2]):
        ns = seniority_n[name]
        req = []
        for k, c in cnt.items():
            share = c / n
            if share < MIN_SKILL_DF:
                continue
            base = overall[k] / total_posts
            lift = share / base if base else 0
            req.append({
                "skill": sk_by_key[k]["name"], "key": k,
                "share": round(share, 3), "posts": c,
                "lift": round(lift, 2),
                "characteristic": lift >= MIN_LIFT,
                "pref_share": round(pref_cnt[k] / c, 3) if c else 0,
                "senior_posts": by_sen["senior"][k],
                "entry_posts": by_sen["entry"][k],
                "senior_share": round(by_sen["senior"][k] / ns.get("senior", 1), 3) if ns.get("senior") else None,
                "entry_share": round(by_sen["entry"][k] / ns.get("entry", 1), 3) if ns.get("entry") else None,
                "quadrant": sk_by_key[k]["quadrant"],
                "spread": sk_by_key[k]["spread"],
                "scarcity": sk_by_key[k]["scarcity"],
            })
        req.sort(key=lambda x: -x["lift"])
        nchar = sum(1 for s in req if s["characteristic"])
        roles.append({"role": name, "family": fam_of[name], "posts": n,
                      "senior_posts": ns.get("senior", 0), "entry_posts": ns.get("entry", 0),
                      "required_skills": req})
        print(f"  {name:22} 공고 {n:>4}건 (시니어 {ns.get('senior',0)} / 그 외 {ns.get('entry',0)}) "
              f"· 요구 {len(req):>3}개 · 변별력 {nchar:>2}개")

    # 역할 간 인접도 — **변별력 있는 스킬만으로** 계산한다
    idx = {r["role"]: {s["key"] for s in r["required_skills"] if s["characteristic"]}
           for r in roles}
    edges = []
    names = [r["role"] for r in roles]
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            sa, sb = idx[a], idx[b]
            u = len(sa | sb)
            if not u:
                continue
            j = len(sa & sb) / u
            if j < 0.05:
                continue
            edges.append({
                "a": a, "b": b, "jaccard": round(j, 4),
                "shared": sorted(sk_by_key[k]["name"] for k in (sa & sb))[:25],
                "shared_count": len(sa & sb),
                "cross_family": fam_of[a] != fam_of[b],
            })
    edges.sort(key=lambda e: -e["jaccard"])
    cross = [e for e in edges if e["cross_family"]]
    print(f"\n간선 {len(edges)} · 직군 교차 {len(cross)} "
          f"({len(cross)*100//max(len(edges),1)}%)")

    nb = defaultdict(list)
    for e in edges:
        nb[e["a"]].append((e["b"], e["jaccard"], e["cross_family"]))
        nb[e["b"]].append((e["a"], e["jaccard"], e["cross_family"]))
    no_cross = 0
    for r in roles:
        ranked = sorted(nb[r["role"]], key=lambda x: -x[1])
        ns = ranked[:TOP_K]
        # 상위 K 안에 직군 교차가 하나도 없으면 가장 가까운 교차 이웃을 끌어온다.
        # 없으면 Route.isHiddenRoute("이 길도 있어요")를 줄 수 없는데,
        # 그건 이 제품의 차별점이라 순위 때문에 잘려서는 안 된다.
        if not any(x[2] for x in ns):
            # 변수 이름을 cross 로 쓰면 바깥의 '직군 교차 간선 목록'을 덮어쓴다.
            pull = next((x for x in ranked if x[2]), None)
            if pull:
                ns = ns[:TOP_K - 1] + [pull]
        r["neighbors"] = [{"role": x[0], "jaccard": x[1], "cross_family": x[2]} for x in ns]
        if not any(x[2] for x in ns):
            no_cross += 1
    print(f"상위 {TOP_K} 이웃에 직군 교차가 없는 역할: {no_cross}/{len(roles)}")

    # ── 문턱 없는 직무별 등장 수 ─────────────────────────────────────────
    #
    # required_skills 는 등장률 5% 이상만 담는다. "이 직무가 요구하는가"를 정하는 데는 맞다.
    # 그런데 그 표로 spread(전이성)를 재면 안 된다 — 여러 직무에서 3%씩 쓰이는 스킬이
    # 어디에서도 안 잡혀 '직무 1개짜리'가 되고, 엔트로피가 0 이 된다.
    #
    # 실측: 5% 문턱을 걸면 스킬의 43%가 직무 1개에만 걸리고 전이성 중앙값이 0.158 이다.
    #       문턱 없이 세면 6% · 0.419 다. PyTorch 2→9개 직무, Jira 5→11개, SAP 2→7개.
    #
    # spread 와 scarcity 는 "이 스킬이 어디에 등장하는가"의 문제이므로 문턱 없는 값을 쓴다.
    skill_job_dist = {}
    for name, (cnt, _, _, _) in counted.items():
        for k, c in cnt.items():
            skill_job_dist.setdefault(k, {})[name] = c
    n_one = sum(1 for v in skill_job_dist.values() if len(v) == 1)
    print(f"문턱 없는 직무 분포 — 스킬 {len(skill_job_dist):,}개 · "
          f"직무 1개에만 등장 {n_one}개 ({n_one / max(1, len(skill_job_dist)):.0%})")

    OUT.write_text(json.dumps({
        "method": "공고 제목에서 역할을 뽑고, 그 공고들에 등장한 사전 등재 스킬을 요구 스킬로 본다",
        "note": "공공기관 공고는 제목이 직무명이 아니라 제외했다",
        "min_posts": MIN_POSTS, "min_skill_share": MIN_SKILL_DF,
        "skill_job_dist_note": "문턱 없는 직무별 등장 공고 수. spread·scarcity 는 이것으로 잰다 "
                               "(required_skills 는 5% 문턱을 거쳐 전이성 계산에 쓰면 안 된다)",
        "skill_job_dist": skill_job_dist,
        "roles": roles, "edges": edges,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {OUT.name}")

    print("\n[직군을 건너뛰는 인접 상위 8 — '이 길도 있어요' 후보]")
    for e in cross[:8]:
        print(f"  {e['jaccard']:.3f} [{fam_of[e['a']]}] {e['a'][:20]:22} → "
              f"[{fam_of[e['b']]}] {e['b'][:20]:22} 공유 {e['shared_count']}개")


if __name__ == "__main__":
    run()
