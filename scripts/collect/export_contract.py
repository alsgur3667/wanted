"""수집 결과를 팀 데이터 계약(docs/DATA_SPEC.md) 형식으로 변환한다.

만드는 것
  data/jobs.json          직무 마스터
  data/skills.json        스킬 온톨로지
  data/job-skills.json    직무 × 스킬 (long format)

추가로 제안하는 것 (계약에 없는 선택 항목 — 검증 스크립트는 모르는 필드를 무시한다)
  job-skills 의 reqFreq / prefFreq   자격요건·우대사항 절에 각각 몇 건 등장했는지
  data/job-adjacency.json            역할 간 인접도와 직군 교차 여부

왜 reqFreq / prefFreq 를 제안하나
  계약은 scarcity 를 log(전체 직무수 / 이 스킬이 있는 직무수) 로 계산한다. 그런데 그것은 IDF 이고
  spread(직무 분포 엔트로피)의 역수와 사실상 같은 값이다 — 이 데이터에서 실측 r = -0.991 이었다.
  두 축이 같은 것을 재면 2×2 가 대각선으로 눌려 leverage(피벗 무기) 사분면이 0개가 된다.
  공고는 스킬을 자격요건과 우대사항 두 칸에 나눠 적는다. '드물어서 있으면 좋은 것'을
  채용담당자가 우대에 적는다 — 추정이 아니라 문서에 적힌 구분이다. 쓸지 말지는 앱이 정하면 된다.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW  # noqa: E402
import synonyms  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "data"

MIN_CHARACTERISTIC = 5      # 계약: 한 직무당 스킬 5개 이상이어야 적합도가 의미 있다

# 역할 id 와 별칭 — 공고 제목에서 이 역할을 찾을 때 쓴 표현들이 그대로 별칭이 된다.
ROLE_ID = {
    "백엔드 개발자": ("be_dev", ["backend", "back-end", "서버 개발", "백엔드"]),
    "프론트엔드 개발자": ("fe_dev", ["frontend", "front-end", "프론트엔드", "웹 퍼블리셔"]),
    "풀스택 개발자": ("fullstack_dev", ["full stack", "fullstack", "풀스택"]),
    #  ⚠️ "iOS 개발자" 는 예전에 생성물(data/jobs.json)에 손으로 박혀 있었다.
    #     다시 돌리면 지워져 resolveJobTitle 이 그 이름을 못 알아본다. 별칭은 여기에 적는다.
    "모바일 개발자": ("mobile_dev", ["android", "iOS developer", "iOS 개발자",
                                 "mobile engineer", "안드로이드"]),
    "데이터 엔지니어": ("data_eng", ["data engineer", "데이터 엔지니어", "data platform engineer"]),
    "데이터 사이언티스트": ("data_scientist", ["data scientist", "ML engineer", "AI engineer", "머신러닝"]),
    "데이터 분석가": ("data_analyst", ["data analyst", "데이터 분석", "analytics engineer", "BI analyst"]),
    "DevOps·SRE": ("devops_sre", ["DevOps", "site reliability", "SRE", "platform engineer", "인프라"]),
    "보안 엔지니어": ("security_eng", ["security engineer", "penetration", "정보보안", "보안"]),
    "QA 엔지니어": ("qa_eng", ["QA engineer", "quality assurance", "test engineer", "SDET", "품질"]),
    "임베디드·펌웨어": ("embedded_dev", ["embedded", "firmware", "임베디드", "펌웨어"]),
    "게임 개발자": ("game_dev", ["game developer", "Unity", "Unreal", "게임 개발"]),
    "아키텍트": ("architect", ["architect", "아키텍트"]),
    "솔루션·세일즈 엔지니어": ("solutions_eng", ["solutions engineer", "sales engineer", "presales"]),
    "IT 지원·헬프데스크": ("it_support", ["service desk", "help desk", "IT support", "기술지원"]),
    "엔지니어링 리더": ("eng_lead", ["engineering manager", "tech lead", "principal engineer", "테크리드"]),
    "소프트웨어 엔지니어": ("sw_eng", ["software engineer", "software developer", "개발자"]),
    "프로덕트 디자이너": ("product_designer", ["product designer", "UX designer", "UI designer", "프로덕트 디자이너"]),
    "그래픽·브랜드 디자이너": ("graphic_designer", ["graphic designer", "brand designer", "그래픽 디자이너"]),
    "모션·영상 디자이너": ("motion_designer", ["motion designer", "video editor", "모션", "영상"]),
    "UX 리서처": ("ux_researcher", ["UX researcher", "user researcher", "리서처"]),
    "디자이너(일반)": ("designer", ["designer", "디자이너"]),
    "프로덕트 매니저": ("product_manager", ["product manager", "product owner", "서비스 기획", "PM"]),
    "프로젝트·프로그램 매니저": ("program_manager", ["project manager", "program manager", "PMO"]),
    "사업·전략 기획": ("biz_strategy", ["strategy", "business development", "사업 기획", "전략 기획"]),
    "마케팅·그로스": ("growth_marketing", ["growth", "marketing", "마케팅", "그로스", "마케터", "퍼포먼스 마케터", "콘텐츠 마케터"]),
    "데이터·비즈니스 기획": ("biz_analyst", ["business analyst", "비즈니스 분석", "경영기획"]),
}

# 계약의 type 은 hard | tool | domain | soft 넷뿐이다. 우리 7종을 여기에 맞춘다.
TYPE_MAP = {
    "language": "tool",         # 프로그래밍 언어도 도구다
    "tool": "tool",
    "office": "tool",
    "concept": "hard",          # REST · MSA · TDD
    "domain": "domain",         # UX · SEO · ERP
    "certification": "hard",    # + isCertification 표시
    "skill_ko": "hard",
}

# 학습 난이도 기본값. 실측이 아니라 유형별 추정이라는 점을 파일에 명시한다.
BASE_DIFFICULTY = {
    "certification": 0.70, "concept": 0.60, "language": 0.60,
    "skill_ko": 0.50, "tool": 0.45, "domain": 0.40, "office": 0.20,
}

# firstStep 템플릿. 계약이 "추상어 금지, 오늘 당장 할 수 있는 행동"을 요구한다.
# 템플릿은 그 수준에 못 미치므로 firstStepSource 로 표시해 둔다.
#
# ⚠️ 템플릿은 type 하나당 문장 하나다. 그래서 "tool" 템플릿 한 줄이 193개 역량에
#    똑같이 붙었다 — Figma·Photoshop·Git·React·iOS 가 전부 "…로 지금 손으로 하는
#    작업 하나를 자동화해 보세요." 가 됐다. 화면에 그대로 나와서 바로 들킨다.
#    그래서 화면에 뜨는 것부터 data/first-steps.json 에 손으로 적어 덮어쓴다.
FIRST_STEP = {
    "certification": "{n} 최근 기출 한 회차를 시간 재고 풀어 보세요. 몇 점이 나오는지가 출발점입니다.",
    "language": "지금 다른 언어로 만든 작은 스크립트 하나를 {n} 로 다시 써 보세요.",
    "tool": "{n} 로 지금 손으로 하는 작업 하나를 자동화해 보세요.",
    "office": "{n} 로 지금 쓰는 문서 한 장을 다시 만들어 보세요.",
    "concept": "{n} 을(를) 적용하기 전과 후의 구조를 그림 한 장으로 비교해 보세요.",
    "domain": "{n} 관점에서 지금 서비스의 문제 하나를 찾아 한 문단으로 써 보세요.",
    "skill_ko": "{n} 을(를) 실제로 해 본 결과물 하나를 만들어 남겨 보세요.",
}

#  사람이 손으로 쓴 첫 단계. 템플릿을 덮어쓴다. 키는 역량 이름이다.
_hs = REPO / "data" / "first-steps.json"
HAND_STEPS = json.loads(_hs.read_text(encoding="utf-8"))["steps"] if _hs.exists() else {}

# 한국어 스킬 id 를 만들 때 쓰는 형태소 대응.
KO_ROMAN = {
    "데이터": "data", "빅데이터": "bigdata", "정보시스템": "info_system", "시스템": "system",
    "소프트웨어": "software", "네트워크": "network", "서버": "server", "클라우드": "cloud",
    "분석": "analysis", "설계": "design", "개발": "development", "구축": "build",
    "운영": "operation", "기획": "planning", "관리": "management", "디자인": "design",
    "마케팅": "marketing", "테스트": "test", "검증": "verification", "자동화": "automation",
    "모델링": "modeling", "시각화": "visualization", "최적화": "optimization",
    "아키텍처": "architecture", "프로그래밍": "programming", "엔지니어링": "engineering",
    "보안": "security", "품질": "quality", "통계": "statistics", "조사": "survey",
    "시각": "visual", "영상": "video", "촬영": "shooting", "편집": "editing",
    "사무": "office", "경영": "business", "전시": "exhibition", "홍보": "pr",
    "서비스": "service", "플랫폼": "platform", "사전": "pre", "포토샵": "photoshop",
    "일러스트": "illustrator", "개인정보": "privacy", "보호법": "protection_act",
    "콘텐츠": "content", "모니터링": "monitoring", "배포": "deployment",
}


def slug(name: str, used: set) -> str:
    """계약 규칙: 영소문자·숫자·밑줄만, 중복 금지."""
    s = name.strip()
    if re.search(r"[가-힣]", s):
        parts, rest = [], s.replace(" ", "")
        while rest:
            for k in sorted(KO_ROMAN, key=len, reverse=True):
                if rest.startswith(k):
                    parts.append(KO_ROMAN[k]); rest = rest[len(k):]; break
            else:
                rest = rest[1:]
        s = "_".join(parts) if parts else ""
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    s = re.sub(r"_+", "_", s) or "skill"
    base, i = s, 2
    while s in used:
        s = f"{base}_{i}"; i += 1
    used.add(s)
    return s


def same_word(variant: str, name: str) -> bool:
    """단순한 대소문자 차이인가.

    소문자로 같다고 다 같은 말은 아니다. 'ReAct'(LLM 추론 기법)가 'React' 의
    표기 변형으로 잡히면 안 된다. 전부 소문자 · 전부 대문자 · 첫 글자만 대문자,
    이 셋만 같은 말의 표기 차이로 본다.
    """
    if variant.lower() != name.lower():
        return False
    return variant in (name.lower(), name.upper(), name.lower().capitalize())


def collect_aliases(keys: set) -> dict:
    """코퍼스에서 실제로 쓰인 표기 변형을 모은다. 이력서 매칭에 쓰인다."""
    seen = defaultdict(Counter)
    tok = re.compile(r"[A-Za-z][A-Za-z0-9+#./\-]{0,29}|[가-힣]{2,}(?: [가-힣]{2,})?")
    with (RAW / "_corpus.jsonl").open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            for t in tok.findall(f"{d['title']} {d['text']}"):
                t = t.strip(".-/")
                k = t.lower()
                if k in keys:
                    seen[k][t] += 1
                elif k.replace(" ", "") in keys:
                    seen[k.replace(" ", "")][t] += 1
    return seen


# 필수/우대를 가르는 데 필요한 최소 관측 수. 1~2건으로 가르면 뒤집히기 쉽다.
MIN_REQ_OBS = 3


def run():
    skills_src = json.loads((RAW / "_skills.json").read_text(encoding="utf-8"))["skills"]
    roles_src = json.loads((RAW / "_roles.json").read_text(encoding="utf-8"))

    skills_src = [s for s in skills_src if s.get("scarcity") is not None]

    # ── 잡음 제거 ────────────────────────────────────────────────────
    before = len(skills_src)
    skills_src = [s for s in skills_src if s["name"].lower() not in synonyms.DROP
                  and s["name"] not in synonyms.DROP]
    print(f"잡음 제거 {before - len(skills_src)}개")

    # ── 표기 통합 ────────────────────────────────────────────────────
    # 흡수되는 쪽은 사전에서 빼고, 그 이름을 대표 표기의 aliases 로 옮긴다.
    # 직무 매핑도 대표 쪽으로 합친다.
    merge, to_canon, rename = synonyms.build([s["name"] for s in skills_src])
    absorbed = set(to_canon)
    print(f"표기 통합 {len(merge)}묶음 · 흡수 {len(absorbed)}개")
    for head, subs in sorted(merge.items()):
        print(f"   {head} ← {', '.join(subs)}")
    name2key = {s["name"]: s["key"] for s in skills_src}
    canon_key = {name2key[n]: name2key[c] for n, c in to_canon.items() if n in name2key and c in name2key}
    skills_src = [s for s in skills_src if s["name"] not in absorbed]

    keys = {s["key"] for s in skills_src} | set(canon_key)
    print(f"스킬 {len(skills_src)}개 · 표기 변형 수집 중…")
    alias_counts = collect_aliases(keys)

    # ── skills.json ──────────────────────────────────────────────────
    used, key2id, skills = set(), {}, []
    for s in sorted(skills_src, key=lambda x: -x["jd_doc_count"]):
        t = s["type"]
        # merge 는 **원래 이름**으로 등록돼 있다. 이름을 먼저 바꾸면 조회가 빗나가
        # 흡수한 이름들이 별칭에서 통째로 사라진다 (AI 코딩 도구에 Claude·Cursor 가 없던 원인).
        orig_name = s["name"]
        if orig_name in rename:            # 흡수 후 대표 이름을 의도한 표기로
            s = dict(s, name=rename[orig_name])
        sid = slug(s["name"], used)
        key2id[s["key"]] = sid
        variants = [v for v, _ in alias_counts.get(s["key"], Counter()).most_common()
                    if v != s["name"] and same_word(v, s["name"])][:6]
        variants += merge.get(orig_name, [])                    # 흡수한 이름 (원래 이름으로 조회)
        if orig_name != s["name"]:
            variants.append(orig_name)                          # 바뀌기 전 대표 이름도 별칭이다
        variants += synonyms.ALIAS.get(s["name"], [])           # 이력서에 나올 표기
        seen_v = set()
        dedup = []
        for v in variants:
            if v.lower() not in seen_v:
                seen_v.add(v.lower()); dedup.append(v)
        variants = dedup
        diff = BASE_DIFFICULTY.get(t, 0.5)
        # 희소할수록 배우기 어렵다고 본다. ±0.15 안에서만 움직인다.
        diff = round(min(0.95, max(0.05, diff + (s["scarcity"] - 0.5) * 0.3)), 2)
        rec = {
            "id": sid,
            "name": s["name"],
            "type": TYPE_MAP.get(t, "hard"),
            "aliases": variants,
            "learnDifficulty": diff,
            "firstStep": FIRST_STEP.get(t, FIRST_STEP["skill_ko"]).format(n=s["name"]),
            # ── 아래는 계약에 없는 선택 항목 ──
            "sourceType": t,
            "isCertification": t == "certification",
            "onMap": s["on_map"],
            "firstStepSource": "template",
            "difficultySource": "estimate:type+scarcity",
        }
        #  사람이 쓴 문장이 있으면 그것이 이긴다.
        if s["name"] in HAND_STEPS:
            rec["firstStep"] = HAND_STEPS[s["name"]]
            rec["firstStepSource"] = "manual"
        skills.append(rec)

    # ── jobs.json · job-skills.json ──────────────────────────────────
    jobs, matrix, dropped = [], [], []
    for r in sorted(roles_src["roles"], key=lambda x: -x["posts"]):
        ch = [x for x in r["required_skills"] if x["characteristic"]]
        if len(ch) < MIN_CHARACTERISTIC:
            dropped.append((r["role"], r["posts"], len(ch)))
            continue
        jid, aliases = ROLE_ID.get(r["role"], (slug(r["role"], used), []))
        jobs.append({
            "id": jid, "title": r["role"], "family": r["family"],
            "aliases": aliases, "sampleSize": r["posts"], "source": "JD",
        })
        # ⚠️ 매핑은 '변별력 있는 것'이 아니라 **등장한 것 전부**를 넣는다.
        #    계약의 weight 는 "공고 18건 중 17건 = 0.94" 그대로이지 변별력이 아니다.
        #    lift 로 거르면 Python·SQL 처럼 두루 쓰이는 스킬이 어느 직무에도 안 붙어
        #    248개 중 146개가 고아가 된다.
        merged_rows = {}
        for x in r["required_skills"]:
            k = canon_key.get(x["key"], x["key"])
            prev = merged_rows.get(k)
            # 합칠 때 weight 는 큰 쪽을 쓴다. 두 표기가 같은 공고에 함께 나올 수 있어
            # 단순히 더하면 실제보다 커진다. max 는 안전한 하한이다.
            if prev is None or x["share"] > prev["share"]:
                merged_rows[k] = dict(x, key=k)
        for x in merged_rows.values():
            sid = key2id.get(x["key"])
            if not sid:
                continue
            row = {
                "jobId": jid, "skillId": sid,
                "weight": round(min(1.0, x["share"]), 3),
                "docFreq": x["posts"], "source": "JD",
            }
            pref = round(x["share"] * x["pref_share"] * r["posts"])
            req = max(0, x["posts"] - pref)
            row["prefFreq"] = pref                       # 선택 항목
            row["reqFreq"] = req                         # 선택 항목

            # ── 필수인가 우대인가 — 공고가 직접 적어 둔 것을 그대로 쓴다 ──────────
            #
            # 계약은 weight(공고 등장 비율) 로 필수(≥0.6)·우대(0.3~0.6)를 가르라고 한다.
            # 그런데 weight 는 "몇 건에 나왔나"이지 "필수인가"가 아니다.
            # 실측하면 매핑 580건 중 510건(88%)이 0.3 미만이라 화면에서 통째로 사라진다.
            #   소프트웨어 엔지니어의 최고값이 Python 0.35, 프로덕트 매니저는 UX/UI 0.18 이다.
            #   직무 24개 중 5개는 필수·우대가 **둘 다 비어** 추천이 아예 안 나온다.
            #
            # 공고는 이미 자격요건 절과 우대사항 절에 나눠 적어 두었다. 그것을 세면 된다.
            # 같은 데이터로 필수·우대가 빈 직무는 24개 중 1개(표본 5건짜리)뿐이다.
            #   소프트웨어 엔지니어 필수 = Python(72) · Java(40) · AWS(39) · TypeScript(37)
            obs = req + pref
            # 변별력 — 이 직무에서 유난히 많이 요구되는가.
            #
            # weight 만 보면 어느 직무에서나 Git·Python 이 위로 온다. 그래서 표본이 작은 직무는
            # 요구 스킬이 범용 도구로만 채워지고, **아무 개발자나 100% 적합**하게 나온다.
            # 실제로 8년차 iOS 개발자에게 임베디드·펌웨어가 1순위(적합도 75)로 추천됐다.
            # lift = 이 직무 등장률 / 전체 평균 등장률. 1보다 크면 이 직무의 특징이다.
            row["lift"] = x.get("lift")
            row["characteristic"] = bool(x.get("characteristic"))
            row["reqShare"] = round(req / obs, 3) if obs else None
            row["requirement"] = (None if obs < MIN_REQ_OBS else
                                  "required" if req > pref else "preferred")
            matrix.append(row)

    # ── 사람이 손으로 고친 것 (1) — 이름·삭제·줄 추가·공고 건수 ──────────
    #
    #  docs/data-dashboard.html 에서 고쳐 내려받은 data/overrides.json 을 읽는다.
    #  판단을 코드가 아니라 데이터로 남기려는 것이다. 다시 돌려도 유지된다.
    #
    #  ⚠️ 세 번에 나눠 적용한다. 순서가 중요하다.
    #     (1) 여기      — 이름·삭제·줄 추가·공고 건수. 이 값들이 뒤의 계산에 들어가야 한다.
    #     (2) 판정 직전 — 해설 필수/우대. 해설 합산이 이 칸을 덮어쓰므로 그 뒤에 얹는다.
    #     (3) 맨 끝     — 필수/우대 판정과 강도 배수. 사람의 최종 판단이라 마지막에 이긴다.
    OV = {}
    _ovf = REPO / "data" / "overrides.json"
    if _ovf.exists():
        OV = json.loads(_ovf.read_text(encoding="utf-8"))
    ov_skills = OV.get("_skills") or {}
    ov_jobs = OV.get("_jobs") or {}
    n_ov1 = 0

    #  역량 이름 고치기 / 지우기
    drop_sids = {sid for sid, v in ov_skills.items() if v.get("drop")}
    for rec in skills:
        v = ov_skills.get(rec["id"])
        if v and v.get("name") and v["name"] != rec["name"]:
            #  바뀌기 전 이름도 별칭으로 남긴다 — 이력서에 옛 표기가 나올 수 있다.
            if rec["name"] not in rec["aliases"]:
                rec["aliases"].append(rec["name"])
            rec["name"] = v["name"]
            rec["overridden"] = True
            n_ov1 += 1
    if drop_sids:
        skills[:] = [x for x in skills if x["id"] not in drop_sids]
        matrix[:] = [m for m in matrix if m["skillId"] not in drop_sids]
        n_ov1 += len(drop_sids)

    #  직무 이름 고치기 / 지우기
    drop_jids = {jid for jid, v in ov_jobs.items() if v.get("drop")}
    for rec in jobs:
        v = ov_jobs.get(rec["id"])
        if v and v.get("title") and v["title"] != rec["title"]:
            rec.setdefault("aliases", []).append(rec["title"])
            rec["title"] = v["title"]
            rec["overridden"] = True
            n_ov1 += 1
    if drop_jids:
        jobs[:] = [x for x in jobs if x["id"] not in drop_jids]
        matrix[:] = [m for m in matrix if m["jobId"] not in drop_jids]
        n_ov1 += len(drop_jids)

    #  없던 줄 넣기 — 사전에 없는 이름이면 역량을 새로 만든다
    by_name = {x["name"].lower(): x for x in skills}
    have_pair = {(m["jobId"], m["skillId"]) for m in matrix}
    job_ids = {j["id"] for j in jobs}
    for a in OV.get("_add") or []:
        jid, nm = a.get("job"), (a.get("skill") or "").strip()
        if not nm or jid not in job_ids:
            continue
        rec = by_name.get(nm.lower())
        if rec is None:
            sid = slug(nm, used)
            rec = {"id": sid, "name": nm, "type": "hard", "aliases": [],
                   "learnDifficulty": 0.5,
                   "firstStep": FIRST_STEP["skill_ko"].format(n=nm),
                   "sourceType": "manual", "isCertification": False, "onMap": False,
                   "firstStepSource": "template", "difficultySource": "manual",
                   "overridden": True}
            skills.append(rec)
            by_name[nm.lower()] = rec
        if (jid, rec["id"]) in have_pair:
            continue
        jd_req, jd_pre = int(a.get("jdReq") or 0), int(a.get("jdPre") or 0)
        n_post = next((j.get("sampleSize") or 0 for j in jobs if j["id"] == jid), 0)
        matrix.append({
            "jobId": jid, "skillId": rec["id"],
            "weight": round((jd_req + jd_pre) / n_post, 4) if n_post else 0.0,
            "docFreq": jd_req + jd_pre, "source": "override",
            "prefFreq": jd_pre, "reqFreq": jd_req,
            "lift": None, "characteristic": False, "reqShare": None,
            "requirement": a.get("tier") if a.get("tier") in ("required", "preferred") else None,
            "overridden": True,
        })
        have_pair.add((jid, rec["id"]))
        n_ov1 += 1

    #  공고 자격요건/우대 건수를 사람이 다시 적은 것
    _bp = {(m["jobId"], m["skillId"]): m for m in matrix}
    for k, v in OV.items():
        if k.startswith("_") or not isinstance(v, dict):
            continue
        st_ = v.get("set") or {}
        row = _bp.get(tuple(k.split("|", 1)))
        if row is None or not ("jdReq" in st_ or "jdPre" in st_):
            continue
        row["reqFreq"] = int(st_.get("jdReq", row.get("reqFreq") or 0))
        row["prefFreq"] = int(st_.get("jdPre", row.get("prefFreq") or 0))
        #  docFreq 는 '이 역량이 나온 공고 수'다. 절별 합계보다 작을 수 없다.
        row["docFreq"] = max(row.get("docFreq") or 0, row["reqFreq"] + row["prefFreq"])
        row["overridden"] = True
        n_ov1 += 1

    if n_ov1:
        print(f"사람 보정(1) 이름·삭제·줄 추가·공고 건수 {n_ov1}건")

    # ── 추가 제안: 인접 그래프 ────────────────────────────────────────
    jid_of = {j["title"]: j["id"] for j in jobs}
    adjacency = [{
        "a": jid_of[e["a"]], "b": jid_of[e["b"]],
        "similarity": e["jaccard"], "crossFamily": e["cross_family"],
        "shared": e["shared"][:10],
    } for e in roles_src["edges"] if e["a"] in jid_of and e["b"] in jid_of]

    OUT.mkdir(exist_ok=True)
    # ── 해설 글을 요구 역량의 근거로 합친다 ────────────────────────────
    #
    #  "JD 에 없다 = 틀렸다"가 아니다. 회사마다 공고에 적는 것이 다르고,
    #  여러 출처가 공통으로 말하는 것은 그 자체가 근거다.
    #  다만 무게는 같을 수 없다 — 공고는 실제 수요이고 해설 글은 통념이다.
    #
    #  그래서 **표본을 합치되 해설 글은 할인**한다. 공고 1건과 해설 글 1건을 같게 보지 않는다.
    #
    #      evidence = (공고 등장수 + α×해설 언급수) / (공고 표본 + α×해설 글 수)
    #
    #  α = 0.5 — 해설 글 1건을 공고 0.5건으로 친다.
    #  이 식은 저절로 옳게 움직인다. 공고가 280건인 직무에서는 해설 글 몇 건이 거의
    #  영향을 못 주고, 공고가 7건뿐인 직무에서는 해설 글이 실제로 빈자리를 메운다.
    #  표본이 얇은 곳일수록 도움이 필요하다는 사실과 맞는다.
    #
    #  ⚠️ weight 는 건드리지 않는다. 계약이 정의한 "공고 등장 비율" 그대로 둔다.
    #     evidence 는 요구 역량을 **고르는 순서**에만 쓴다.
    GUIDE_ALPHA = 0.5
    gv = RAW / "guides" / "verified.json"
    guide_rows, guide_docs = {}, {}
    if gv.exists():
        vr = json.loads(gv.read_text(encoding="utf-8"))["rows"]
        for r in vr:
            guide_rows[(r["jobId"], r["skillId"])] = r
            guide_docs[r["jobId"]] = r["guideDocs"]

    id2name = {x["id"]: x["name"] for x in skills}
    n_only, n_boost = 0, 0
    by_pair_m = {(m["jobId"], m["skillId"]): m for m in matrix}
    job_n = {j["id"]: j["sampleSize"] for j in jobs}

    for (jid, sid), r in guide_rows.items():
        if jid not in job_n or sid not in id2name:
            continue
        g_n, g_docs = r["guideMentions"], max(1, guide_docs.get(jid, 1))
        row = by_pair_m.get((jid, sid))
        if row is None:
            # 공고에는 없고 해설 글에만 있는 것. 버리지 않는다 — 다만 근거가 약하다고 적는다.
            row = {"jobId": jid, "skillId": sid, "weight": 0.0, "docFreq": 0,
                   "source": "guide", "prefFreq": 0, "reqFreq": 0,
                   "lift": None, "characteristic": False,
                   "reqShare": None, "requirement": None}
            matrix.append(row)
            by_pair_m[(jid, sid)] = row
            n_only += 1
        else:
            n_boost += 1
        row["guideMentions"] = g_n
        row["guideDocs"] = g_docs
        #  ⚠️ 해설 글이 '필수'라 했는지 '우대'라 했는지를 반드시 같이 옮긴다.
        #     이 두 칸을 안 옮겨서 아래 tier 투표의 해설 몫(가중치 1)이 통째로 죽어 있었다.
        #     verified.json 에는 129줄에 판정이 있는데(필수 108·우대 42) 매트릭스에서는 전부 0이라,
        #     필수/우대가 **공고의 절 위치만으로** 정해졌다.
        #     표본이 7건인 임베디드에서 RTOS(공고 3건 전부 우대 절)가 우대로 굳은 이유다.
        row["guideRequired"] = r.get("guideRequired") or 0
        row["guidePreferred"] = r.get("guidePreferred") or 0
        row["verification"] = r["verification"]
        row["evidence"] = round(
            (row["docFreq"] + GUIDE_ALPHA * g_n) / (job_n[jid] + GUIDE_ALPHA * g_docs), 4)

    # ── 세 번째 근거: 공인 직업 분석 체계 (O*NET · NCS) ──────────────────
    #
    #  회사마다 공고에 적는 것이 다르다. 어느 회사도 안 적었다고 필요 없는 것은 아니다.
    #  O*NET(미 노동부)·NCS(고용노동부)는 직업을 조사해 놓은 공인 자료다. 개인 의견이 아니다.
    #
    #  ⚠️ 그대로 쓰면 안 된다. O*NET 의 직업별 소프트웨어 목록은 넓어서
    #     Software Developers 에 Photoshop 이 실려 있다. 변별력으로 거른 것만 쓴다
    #     (build_ontology_reqs.py). 무게도 해설 글보다 낮게 잡는다 — 미국 조사이고 갱신이 느리다.
    #  ⚠️ 표본에 비례해 더하면 안 된다. 처음에 표본의 30%를 가상 공고로 줬더니
    #     소프트웨어 엔지니어(280건)에 가상 공고가 84건이나 붙어, 공고 19건짜리 Django 가
    #     1순위가 됐다. O*NET 은 직업 1~3개를 본 것이지 공고 84건이 아니다.
    #     **고정된 소수의 가상 공고**로 더한다. 표본이 큰 직무에서는 거의 영향이 없고,
    #     표본이 5건뿐인 직무에서는 실제로 빈자리를 메운다 — 도움이 필요한 곳에만 작용한다.
    ONTO_VIRT = 4
    of = RAW / "_ontology_reqs.json"
    n_onto_only = n_onto_boost = 0
    if of.exists():
        od = json.loads(of.read_text(encoding="utf-8"))["jobs"]
        for jid, rows in od.items():
            if jid not in job_n:
                continue
            for sid, v in rows.items():
                if sid not in id2name:
                    continue
                # 근거의 세기를 0~1 로 만든다. O*NET 은 대응 직업 중 몇 개가 쓰는가,
                # NCS 는 능력단위 중 몇 개가 언급하는가.
                o = v["onet"] / max(1, v.get("onetOf") or 1) if v.get("onet") else 0
                n = min(1.0, v["ncs"] / max(1, v.get("ncsOf") or 1) * 10) if v.get("ncs") else 0
                strength = max(o, n)
                if strength <= 0:
                    continue
                row = by_pair_m.get((jid, sid))
                if row is None:
                    row = {"jobId": jid, "skillId": sid, "weight": 0.0, "docFreq": 0,
                           "source": "ontology", "prefFreq": 0, "reqFreq": 0,
                           "lift": None, "characteristic": False,
                           "reqShare": None, "requirement": None}
                    matrix.append(row)
                    by_pair_m[(jid, sid)] = row
                    n_onto_only += 1
                else:
                    n_onto_boost += 1
                row["ontology"] = {"onet": v.get("onet", 0), "onetOf": v.get("onetOf", 0),
                                   "onetHot": v.get("onetHot", False), "onetLift": v.get("onetLift"),
                                   "ncs": v.get("ncs", 0)}
                # 표본에 가상 공고로 더한다. 해설 글과 같은 방식이되 할인율이 더 크다.
                virt = ONTO_VIRT
                num = row["docFreq"] + GUIDE_ALPHA * row.get("guideMentions", 0) + strength * virt
                den = (job_n[jid] + GUIDE_ALPHA * row.get("guideDocs", 0) + virt)
                row["evidence"] = round(num / den, 4)
        print(f"공인 체계 합산 — 기존 근거 보강 {n_onto_boost}건 · 새로 추가 {n_onto_only}건")

    # 해설 글·공인 체계 근거가 없는 것도 evidence 를 채워 둔다 (= weight 와 같다)
    for m in matrix:
        m.setdefault("evidence", round(m["weight"], 4))

    # ── 합의(agreement)와 필수/우대 판정 ─────────────────────────────────
    #
    #  왜 바꾸나 — 지금까지 필수는 "상위 5개 자르기"였다. 그래서 어느 직무든 필수가 정확히 5개다.
    #  정의가 넓은 직무(풀스택)는 그 5칸이 범용 웹 스택으로 채워져 **남의 직무 사람까지 흡수**한다.
    #  독립 표본(설문 4,878건)으로 재 보니 자주 틀리는 8개 방향이 전부 '→ 풀스택'이었다.
    #
    #  대신 **출처가 뭐라고 말했는지**로 가른다.
    #    필수 : 공고 자격요건 절 · 해설 글의 "필수·반드시·기본기" 대목 · 공인 체계
    #    우대 : 공고 우대사항 절 · 해설 글의 "우대·있으면 좋다·가산점" 대목
    #
    #  그리고 **여러 출처가 함께 말한 것**을 올린다. 회사마다 공고에 적는 것이 다르니
    #  한 곳만 말한 것보다 여러 곳이 말한 것이 믿을 만하다.
    #  사람이 손으로 고친 것 (2) — 해설 글의 필수/우대.
    #  해설 합산이 이 두 칸을 덮어쓰므로 그 뒤, 판정 앞에서 얹는다.
    _bp2 = {(m["jobId"], m["skillId"]): m for m in matrix}
    for _k, _v in OV.items():
        if _k.startswith("_") or not isinstance(_v, dict):
            continue
        _st = _v.get("set") or {}
        _row = _bp2.get(tuple(_k.split("|", 1)))
        if _row is None or not ("gReq" in _st or "gPre" in _st):
            continue
        _row["guideRequired"] = int(_st.get("gReq", _row.get("guideRequired") or 0))
        _row["guidePreferred"] = int(_st.get("gPre", _row.get("guidePreferred") or 0))
        _row["guideMentions"] = max(_row.get("guideMentions") or 0,
                                    _row["guideRequired"] + _row["guidePreferred"])
        _row["overridden"] = True

    AGREE_BONUS = 0.25          # 출처가 하나 늘 때마다 importance 를 이만큼 올린다
    MUST_MIN_SHARE = 0.15       # 필수는 그 직무 공고의 이 비율 이상에 나와야 한다
    for m in matrix:
        jd_req = m.get("reqFreq") or 0
        jd_pre = m.get("prefFreq") or 0
        g_req = m.get("guideRequired") or 0
        g_pre = m.get("guidePreferred") or 0
        g_any = m.get("guideMentions") or 0
        onto = 1 if m.get("ontology") else 0

        # 몇 개 출처가 이 역량을 말했나 (0~3)
        agree = (1 if (jd_req + jd_pre) > 0 else 0) + (1 if g_any > 0 else 0) + onto
        m["agreement"] = agree
        m["importance"] = round(min(1.0, (m["evidence"] or 0) * (1 + AGREE_BONUS * max(0, agree - 1))), 4)

        #  필수/우대 — 출처들이 각각 어느 쪽으로 말했는지 표를 센다.
        #  공고 절 구분은 실제 문서에 적힌 것이라 무게를 크게 준다.
        #  ⚠️ 공인 체계는 표를 던지지 않는다.
        #     O*NET·NCS 는 "이 직업이 이 도구를 쓴다"고만 말하지 **필수인지 우대인지는 말하지 않는다.**
        #     필수 쪽 표로 세었더니 공고 1건짜리 GitHub·Docker 가 임베디드의 필수가 되고,
        #     정작 공고 3건인 RTOS·FreeRTOS 는 우대로 밀렸다.
        #     공인 체계는 importance(강도)에만 반영하고 필수/우대 판정에서는 뺀다.
        req_vote = (2 if jd_req > jd_pre else 0) + (1 if g_req > g_pre else 0)
        pre_vote = (2 if jd_pre > jd_req else 0) + (1 if g_pre > g_req else 0)
        #  ── 필수가 되려면 근거가 얇아선 안 된다 ─────────────────────────
        #
        #  전 직무 요구 목록을 사람이 읽어 보고 넣은 조건이다. 두 가지가 반복해서 잘못 올라왔다.
        #
        #  ① 공고 1건짜리 — 표본이 작은 직무는 최고 강도도 낮아 문턱을 쉽게 넘는다.
        #     모바일 개발자 필수에 React·TypeScript(각 공고 1건), QA 에 Swift·Ruby·Scala·C#(각 1건)이
        #     올라왔다. 그 회사 스택을 적어 둔 것이지 그 직무의 요구가 아니다.
        #
        #  ② 공인 체계만 근거인 것 — O*NET 의 직업별 소프트웨어는
        #     "그 직업 사람이 만질 수 있는 것"이라 요구가 아니다. 목록이 넓다.
        #     모션·영상 디자이너 필수가 Swift·Vue·CSS·HTML·AutoCAD 가 됐다 (공고 0건).
        #     보조 근거로만 쓰고, 그것만으로 필수가 되지는 못하게 한다.
        #
        #  근거가 얇으면 요구에서 빼는 것이 아니라 **우대로 내린다** — 사실이 아닌 게 아니라
        #  필수라고 말할 만큼 확실하지 않은 것이다.
        #  손으로 넣은 줄은 아래 규칙들을 타지 않는다. 사람이 직접 넣은 것이 근거다.
        #  실제로 "테스트 설계(공고 4건)"를 QA 에 넣었더니 표본 20건 미만 규칙에 걸려
        #  우대로 내려갔다. 사람의 입력을 기계가 되물어보는 꼴이다.
        if m.get("source") == "override" and m.get("requirement") in ("required", "preferred"):
            m["tier"] = m["requirement"]
            if m["tier"] == "required":
                m["pinned"] = True
            continue

        jd_any = jd_req + jd_pre
        thin = (jd_any + g_any) < 2      # 공고·해설을 합쳐 2건 미만이면 얇다
        #  ③ 표본이 아주 작은 직무는 공고만으로 필수를 정하지 않는다.
        #
        #     공고 15건짜리 QA 에서 Scala·C#·Swift·Ruby 가 각각 3건·3건·2건·2건에 나와
        #     전부 필수가 됐다. 테스트 **대상** 언어를 적어 둔 것이지 QA 의 요구가 아니다.
        #     표본이 작으면 한 회사의 스택이 곧 '그 직무의 요구'가 되어 버린다.
        #
        #     그래서 20건 미만인 직무는 해설 글이 함께 말한 것만 필수로 올린다.
        #     실측(설문 3,420건, 같은 조건) — 1위 29.2% → 30.4%.
        #     QA 가 남의 직무 사람을 삼키던 것이 멎었다(소프트웨어 엔지니어 105건·임베디드 86건).
        if job_n.get(m["jobId"], 0) < 20 and g_any == 0:
            thin = True
        #  ④ 필수라면 그 직무 공고에 되풀이해 나와야 한다.
        #
        #     엔지니어링 리더의 필수 3위가 Ruby(공고 63건 중 6건)였고, 솔루션 엔지니어에는
        #     Swift·MongoDB(각 34건 중 2건)가 올라왔다. 리더 자리의 요구가 특정 언어일 리 없다.
        #     한두 회사가 자기 스택을 적어 둔 것이 그 직무의 요구로 둔갑한 것이다.
        #
        #     ⚠️ 강도(importance)로는 못 거른다. 표본이 작으면 6/63 도 최고 강도의 40% 를 넘는다.
        #        '몇 %의 공고가 말했나'는 표본 크기에 휘둘리지 않는 별개의 잣대다.
        #
        #     문턱은 실측으로 골랐다 (설문 3,420건, 같은 조건).
        #        없음   1위 30.4%  3위 안 53.7%
        #        0.08   1위 29.6%  3위 안 53.4%
        #        0.10   1위 29.6%  3위 안 53.6%
        #        0.15   1위 31.8%  3위 안 55.3%   ← 채택. 두 지표 모두 정점
        #        0.20   1위 30.1%  3위 안 54.3%
        #        0.25   1위 29.9%  3위 안 54.3%
        #
        #     해설 글이 필수라고 말한 것은 면제한다 — 공고에 덜 나와도 그건 다른 근거다.
        #     수기 업무 역량(docFreq 0)도 이 잣대를 타지 않는다.
        n_job = job_n.get(m["jobId"], 0)
        if n_job and (m.get("docFreq") or 0) and g_req == 0:
            if (m["docFreq"] / n_job) < MUST_MIN_SHARE:
                thin = True
        if agree == 0:
            m["tier"] = None
        elif thin or (onto and jd_any == 0 and g_any == 0):
            m["tier"] = "preferred"
        elif req_vote > pre_vote:
            m["tier"] = "required"
        elif pre_vote > req_vote:
            m["tier"] = "preferred"
        else:
            m["tier"] = "required" if (jd_req + g_req) >= (jd_pre + g_pre) else "preferred"

    # ── 사람이 손으로 고친 것을 마지막에 얹는다 ──────────────────────────
    #
    #  데이터에서 자동으로 뽑은 값이 늘 맞지는 않는다. 실제로 모션·영상 디자이너의 Swift,
    #  QA 의 Ruby·Scala, 모바일의 React 를 사람이 눈으로 찾아 코드를 고쳐 왔다.
    #  같은 일이 반복되므로 **판단을 데이터로 남긴다** — docs/data-dashboard.html 에서 고치고
    #  data/overrides.json 으로 저장하면 여기서 적용된다. 다시 돌려도 유지된다.
    #
    #  ⚠️ 원본 수치(weight·docFreq·evidence)는 건드리지 않는다. tier 와 강도 배수만 바꾼다.
    #     어떤 값이 사람 손을 탔는지 언제나 구분할 수 있어야 한다.
    n_ov = 0
    if OV:
        by_pair2 = {(m["jobId"], m["skillId"]): m for m in matrix}
        drop = set()
        for k, v in OV.items():
            if k.startswith("_") or not isinstance(v, dict):
                continue
            jid, _, sid = k.partition("|")
            row = by_pair2.get((jid, sid))
            if not row:
                continue
            n_ov += 1
            row["overridden"] = True
            if v.get("tier") == "exclude":
                drop.add((jid, sid))
                continue
            if v.get("tier") in ("required", "preferred"):
                row["tier"] = v["tier"]
                #  사람이 '필수'라고 한 줄은 강도 문턱(1위 대비 40%)을 타지 않는다.
                #  실제로 임베디드의 RTOS 를 필수로 지정했는데 강도 1.05 가 문턱 1.2 에
                #  못 미쳐 목록에 안 나왔다. 손으로 고치는 의미가 없어진다.
                row["pinned"] = v["tier"] == "required" or None
                if row["pinned"] is None:
                    del row["pinned"]
            elif v.get("tier") == "other":
                row["tier"] = None
            if v.get("mul"):
                row["importance"] = round(min(1.0, (row.get("importance") or 0) * v["mul"]), 4)
        if drop:
            matrix[:] = [m for m in matrix if (m["jobId"], m["skillId"]) not in drop]
        print(f"사람 보정(3) 판정·강도 {n_ov}건 (제외 {len(drop)}건) — data/overrides.json")

    tc = Counter(m["tier"] for m in matrix)
    ac = Counter(m["agreement"] for m in matrix)
    print(f"판정 — 필수 {tc['required']:,} · 우대 {tc['preferred']:,} · 판정 보류 {tc[None]:,}")
    print(f"출처 합의 — 1곳 {ac[1]:,} · 2곳 {ac[2]:,} · 3곳 {ac[3]:,} · 근거 없음 {ac[0]:,}")
    print(f"해설 글 합산 — 공고에도 있던 것 {n_boost}건 보강 · 해설에만 있던 것 {n_only}건 추가")

    # ── 해설 글 교차검증 결과를 선택 필드로 얹는다 ────────────────────────
    #
    # 공고는 "지금 그 회사가 원하는 것"만 적는다. 신입에게 무엇이 필요한지는 잘 안 적힌다.
    # 그래서 현직자·교육기관이 쓴 직무 해설 글을 따로 모아(verify_guides.py) 대조했다.
    #
    # 무게를 섞지 않는다 — 블로그는 개인 의견이고 공고는 실제 수요다. weight 는 그대로 두고
    # 옆에 등급만 붙인다. 쓸지 말지는 앱이 정한다.
    #   confirmed     같은 직무의 공고에도 나온다 → 시장이 실제로 요구
    #   corroborated  해설 글 2건 이상이 일치하거나 공인 체계(O*NET·ESCO·NCS)에 있다
    #   unverified    해설 글 1건에서만 → 개인 의견일 수 있다. 그대로 쓰지 말 것
    vf = RAW / "guides" / "verified.json"
    if vf.exists():
        vr = json.loads(vf.read_text(encoding="utf-8"))["rows"]
        by_pair = {(r["jobId"], r["skillId"]): r for r in vr}
        seen = set()
        for m in matrix:
            r = by_pair.get((m["jobId"], m["skillId"]))
            if r:
                m["guideMentions"] = r["guideMentions"]
                m["verification"] = r["verification"]
                seen.add((m["jobId"], m["skillId"]))
        # 공고에는 없고 해설 글에만 있는 것은 matrix 에 넣지 않는다.
        # weight 를 지어내야 하는데, 언급 횟수와 공고 빈도는 단위가 다르다.
        # 대신 몇 건인지만 알려 두고 원본은 verified.json 에 남긴다.
        only = [r for k, r in by_pair.items() if k not in seen]
        print(f"해설 글 교차검증 — 계약에 등급 표시 {len(seen)}건 · "
              f"해설에만 있어 보류 {len(only)}건 (data/raw/guides/verified.json)")

    # ── 같은 기술이 두 스킬로 갈리지 않았는지 ──────────────────────────
    #
    # 어떤 스킬의 별칭이 **다른 스킬의 이름**이면, 같은 글자가 두 번 세어진다.
    # 실제로 Airflow/Apache Airflow · Photoshop/Adobe Photoshop · Vue/Vue.js ·
    # MSA/마이크로서비스 아키텍처 가 각각 둘로 갈려 있었다.
    # validate-data.mjs 는 이름이 다르면 통과시키므로 여기서 잡는다.
    #
    # 고치는 곳은 synonyms.MERGE 다 — ALIAS 에만 적으면 코퍼스에 그 표기가 있을 때 별도 스킬로 남는다.
    by_name = {x["name"].lower(): x["id"] for x in skills}
    clash = [(x["name"], a) for x in skills for a in x.get("aliases", [])
             if by_name.get(a.lower(), x["id"]) != x["id"]]
    if clash:
        lines = "\n".join(f"    '{a}' 는 [{n}] 의 별칭인데 그 자체로도 스킬이다" for n, a in clash)
        raise SystemExit("같은 기술이 두 스킬로 갈렸다 — synonyms.MERGE 에 넣어 흡수하라:\n" + lines)

    #  끝에 개행을 붙인다. 없으면 다시 돌릴 때마다 마지막 줄이 diff 로 잡혀
    #  "무엇이 진짜 바뀌었는지"가 파묻힌다.
    def _dump(name, obj):
        (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n",
                                encoding="utf-8")

    _dump("skills.json", skills)
    _dump("jobs.json", jobs)
    _dump("job-skills.json", matrix)
    _dump("job-adjacency.json", {
        "note": "계약에 없는 추가 제안. 역할 간 요구 스킬 겹침. "
                "crossFamily 가 true 면 직군을 건너뛰는 경로이고 Route.isHiddenRoute 의 근거가 된다.",
        "edges": adjacency,
    })

    print(f"\n직무 {len(jobs)}개 · 스킬 {len(skills)}개 · 매핑 {len(matrix)}건 · 인접 {len(adjacency)}건")
    if dropped:
        print(f"제외한 직무 {len(dropped)}개 (변별력 스킬 {MIN_CHARACTERISTIC}개 미만):")
        for name, posts, n in dropped:
            print(f"   {name}  공고 {posts}건인데 변별력 {n}개")
    for f in ("jobs.json", "skills.json", "job-skills.json", "job-adjacency.json"):
        print(f"  data/{f:22} {(OUT / f).stat().st_size / 1024:7.1f} KB")


if __name__ == "__main__":
    run()
