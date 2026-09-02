"""스킬 어휘 사전 — 형태·공인목록으로 거르고, JD 는 빈도 계산에만 쓴다.

앞선 세 번의 실패
  ① 온톨로지 어휘를 JD 에서 찾기(하향식) → 4%만 매칭. 출처마다 문체가 달라서.
  ② JD 빈도 상위 뽑기(상향식)          → 장애인·면접전형 같은 법정 상용구가 상위 독식.
  ③ 상한 df 로 상용구 자르기            → 상용구가 상한 바로 아래 몰려 84개밖에 못 잘림.

배운 것
  빈도로는 스킬과 상용구를 가를 수 없다. 둘 다 자주 나온다.
  가르는 것은 **형태**다. 도구 이름은 생김새가 다르다 — PostgreSQL, AWS, C++, Node.js.
  그래서 후보 자격을 형태와 공인목록으로 정하고, JD 는 '얼마나 쓰이나'만 답하게 한다.

산출: data/raw/_skills.json
  scarcity 는 여전히 null. 공급(사람) 데이터가 없다 — Phase 3.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW  # noqa: E402

ONTO = RAW / "ontology"
OUT = RAW / "_skills.json"

MIN_DF = 10   # 4로 두면 4~9건짜리에서 엔트로피가 요동쳐 전이성 상위가 잡음으로 찬다
MAX_DF_RATIO = 0.35

EN_TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9+#./\-]{0,29}")
KO_CHUNK = re.compile(r"[가-힣]{2,}")
HANGUL = re.compile(r"[가-힣]")

# ── 영문: 도구 이름의 생김새 ────────────────────────────────────────────
CAMEL = re.compile(r"^[A-Za-z]+[A-Z][A-Za-z]*$")        # PostgreSQL, JavaScript, GraphQL
ALLCAPS = re.compile(r"^[A-Z][A-Z0-9]{1,6}$")           # AWS, SQL, CI, API, GCP
SYMBOLIC = re.compile(r"^[A-Za-z][A-Za-z0-9]*([+#]{1,2}|\.[a-z]{2,4}|[0-9]+)$")  # C++, C#, node.js, S3
DOTTED = re.compile(r"^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$")                  # Node.js, ASP.NET

# 생김새는 맞지만 스킬이 아닌 것
EN_BLOCK = {
    "id", "ok", "us", "uk", "eu", "kr", "ceo", "cto", "coo", "cfo", "hr", "pr",
    "faq", "pdf", "url", "www", "http", "https", "gmt", "utc", "usd", "eur", "krw", "am", "pm",
    "llc", "ltd", "inc", "gmbh", "co", "etc", "eg", "ie", "vs", "no", "tv", "pc", "os",
    # 문장 부스러기
    "e.g", "i.e", "u.s", "u.k", "ph.d", "b.s", "m.s", "a.m", "p.m", "etc.",
    # 어학시험 — 성적이지 스킬이 아니다. 공공기관 공고에 상시 등장한다.
    "toeic", "toefl", "teps", "opic", "ibt", "ielts", "jlpt", "hsk", "flex", "snult",
    # 기타
    "ncs", "ms", "ami", "n/a", "faq",
}
DOMAIN = re.compile(r"\.(com|co|kr|net|org|io|ai|gov|edu)$", re.I)

# ── 한국어: 스킬을 가리키는 접미 ────────────────────────────────────────
KO_SUFFIX = ("개발", "설계", "분석", "기획", "디자인", "구축", "운영", "테스트", "최적화",
             "자동화", "모델링", "시각화", "퍼블리싱", "마케팅", "리서치", "아키텍처",
             "프로그래밍", "엔지니어링", "튜닝", "배포", "리팩토링", "코딩", "검증",
             "모니터링", "브랜딩", "일러스트", "편집", "촬영", "영상제작", "타이포그래피")
KO_BLOCK = {"기술개발", "연구개발", "사업기획", "인력운영", "예산운영"}   # 직무가 아니라 조직 활동

# 2그램의 앞 덩어리로 오면 안 되는 말.
# 원문 "우대: 프로그래밍 …" 에서 인접 한글 덩어리가 그대로 이어붙어 '우대 프로그래밍' 이 되는 것을 막는다.
KO_HEAD_BLOCK = {
    "우대", "필수", "자격", "요건", "담당", "주요", "해당", "관련", "기타", "이상", "이하",
    "관리", "운영", "사업", "프로그램", "업무", "직무", "분야", "부문", "채용", "모집",
    "경력", "신입", "가능", "필요", "지원", "포함", "제외", "또는", "이나", "다음", "아래",
    "위와", "각종", "일부", "전체", "본인", "회사", "기관", "부서", "조직", "전형", "평가",
}


def load_onet_tools():
    sw = pd.read_csv(ONTO / "onet_31_0/Software Skills.txt", sep="\t", dtype=str)
    tools, hot = {}, set()
    for _, r in sw.iterrows():
        n = str(r["Workplace Example"] or "").strip()
        if len(n) < 2:
            continue
        tools[n.lower()] = n
        if r["Hot Technology"] == "Y":
            hot.add(n.lower())
    return tools, hot


def load_ncs_terms():
    terms = {}
    with (ONTO / "work24_ncs/ability_units.jsonl").open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            for s in json.loads(line)["knowledge_skills"]:
                s = s.strip()
                if 2 <= len(s) <= 20:
                    terms[s] = s
    return terms


def load_esco_terms():
    esco = json.loads((ONTO / "esco/occupations.json").read_text(encoding="utf-8"))
    out = set()
    for o in esco:
        for s in o["essential_skills"] + o["optional_skills"]:
            out.add(s.strip().lower())
    return out


def load_allowlist():
    """허용 목록과 유형. build_allowlist.py 가 만든다."""
    p = ONTO / "allowlist.json"
    if not p.exists():
        raise SystemExit("allowlist.json 이 없다. 먼저 build_allowlist.py 를 실행할 것.")
    d = json.loads(p.read_text(encoding="utf-8"))
    return d["types"], set(d["too_broad"]), set(d["not_skill"]), set(d["map_types"])


ALLOW: dict = {}
BLOCK: set = set()
MAP_TYPES: set = set()


# 일반 영단어와 철자가 겹치는 약어·개념어.
# "solid backend experience" 의 solid 를 SOLID 원칙으로, "rest of the team" 의 rest 를
# REST API 로 세면 안 된다. 이런 말은 **원문이 대문자일 때만** 인정한다.
CASE_SENSITIVE = {
    "solid", "rest", "regression", "go", "r", "c", "d", "swift", "rust", "scratch",
    "processing", "prolog", "io", "nim", "elm", "julia", "dart", "hack", "self",
    "factor", "logo", "pure", "red", "ring", "squirrel", "clean", "curl", "eagle",
    "gap", "ice", "jolie", "less", "lex", "limbo", "max", "mask", "mirah", "modula",
    "monkey", "nu", "oz", "papyrus", "pep8", "pic", "pike", "quake", "raku", "rebol",
    "shen", "slash", "solution", "stan", "supercollider", "turing", "unity", "vim",
    "wisp", "x10", "xc", "yang", "zap", "zeek", "zig", "usability", "prototyping",
    "wireframe", "word", "excel", "outlook", "confluence", "notion",
}


def en_is_skill(surface: str, tools: dict) -> bool:
    """영문은 허용 목록에 있는 것만 인정한다.

    예전에는 생김새(CamelCase·대문자약어·기호)만 보고 통과시켰는데,
    그러면 IMPORTANT·NOTICE·OTE·KDN 같은 것이 전부 스킬이 된다.
    생김새는 '스킬처럼 보이는가'만 말할 뿐 '스킬인가'를 말하지 못한다.

    대신 목록에 없는 새 도구는 놓친다. 정밀도를 택한 결과이고,
    새 도구가 눈에 띄면 build_allowlist.py 의 보완 목록에 추가한다.
    """
    low = surface.lower()
    if low in BLOCK or len(low) < 2 or DOMAIN.search(low):
        return False
    if low not in ALLOW and low not in tools:
        return False                       # ① 후보 자격 — 허용 목록에 있는 이름인가

    # ② 실제 용례 확인 — 이 문장에서 스킬로 쓰였는가.
    #
    # 목록만 믿으면 안 된다. Linguist 에 BE·Make·Just 라는 언어가, simple-icons 에
    # Now·Here·Origin 이라는 서비스가 실재해서, 평범한 영어 문장의 be·build·make·help 가
    # 전부 스킬로 잡혔다. 762건짜리 'be' 가 최상위에 올랐다.
    #
    # 그렇다고 '첫 글자 대문자'로 거르면 안 된다. 영어는 문장 첫 단어를 늘 대문자로 쓴다.
    # "Build scalable systems" 의 Build 가 그대로 통과한다.
    #
    # 여기서는 후보만 통과시키고, **대문자로 쓰인 비율**로 뒤에서 거른다(cap_ratio).
    # Python 은 문장 어디에 있든 대문자지만 build 는 첫머리에서만 대문자다.
    return True


def skill_type(key: str, tools: dict) -> str:
    t = ALLOW.get(key)
    if t:
        return t
    if key in tools:
        return "tool"
    return "skill_ko" if HANGUL.search(key) else "other"


def canon(key: str, lang: str, tools: dict) -> str:
    """표기 흔들림을 하나로 모은다.  APIs→api,  데이터 분석→데이터분석"""
    if lang == "ko":
        return key.replace(" ", "")
    if len(key) > 3 and key.endswith("s") and key[:-1] in tools:
        return key[:-1]
    return key


def ko_is_skill(term: str, ncs: dict) -> bool:
    """한국어 스킬인가.

    접미만 보고 통과시키면 조각이 들어온다.
    · '디자인'·'자동화'·'테스트' — 접미어 그 자체. 수식어가 없어 AI·IT 만큼 포괄적이다.
    · '구축 운영'·'기획 운영'    — 앞뒤가 모두 접미어인 2그램. 원문의 "구축·운영" 나열이
                                 그대로 붙은 것이지 스킬 이름이 아니다.
    그래서 **접미어 앞에 수식어가 있을 것**을 요구한다. '데이터분석'은 되고 '분석'은 안 된다.
    """
    if term in KO_BLOCK:
        return False
    if term in ncs:
        return True                       # NCS 등재어는 그대로 인정한다
    if not (term.endswith(KO_SUFFIX) and 3 <= len(term) <= 16):
        return False

    parts = term.split()
    if len(parts) == 2 and parts[0] in KO_SUFFIX:
        return False                      # 구축 운영 · 기획 운영 · 개발 운영
    head = term[:-len(next(x for x in KO_SUFFIX if term.endswith(x)))].strip()
    return len(head) >= 2                 # 접미어 앞에 수식어가 있어야 한다


def extract_keys(text: str, tools: dict, ncs: dict, multiword: set) -> set:
    """한 덩어리 텍스트에서 스킬 후보 키를 뽑는다.

    multiword 는 '이 문서 전체에 있다고 이미 확인된' 여러 단어짜리 도구명이다.
    1,763개를 매번 전부 훑으면 느리니, 문서 단위로 한 번 좁힌 것을 재사용한다.
    """
    if not text:
        return set()
    out = set()
    for tok in EN_TOKEN.findall(text):
        tok = tok.strip(".-/")
        if en_is_skill(tok, tools):
            k = tok.lower()
            out.add(k)
            tok_all[k] += 1
            if tok[0].isupper():
                tok_cap[k] += 1
                surface_hint[k] = tools.get(k, tok)     # 대문자 표기를 대표로 삼는다
            else:
                surface_hint.setdefault(k, tools.get(k, tok))

    low = text.lower()
    for k in multiword:
        if k in low:
            out.add(k)

    if HANGUL.search(text):
        chunks = KO_CHUNK.findall(text)
        for i, w in enumerate(chunks):
            for g in (1, 2):
                if i + g > len(chunks):
                    break
                if g == 2 and chunks[i] in KO_HEAD_BLOCK:
                    continue
                term = "".join(chunks[i:i + g]) if g == 1 else " ".join(chunks[i:i + g])
                if ko_is_skill(term, ncs):
                    out.add(term)
                    surface_hint.setdefault(term, term)
    return out


surface_hint: dict = {}

# 토큰이 몇 번 나왔고 그중 몇 번이 대문자였는지. cap_ratio 계산에 쓴다.
tok_all: Counter = Counter()
tok_cap: Counter = Counter()


def run():
    global ALLOW, BLOCK, MAP_TYPES
    types_, broad, notskill, map_types = load_allowlist()
    ALLOW = types_
    BLOCK = broad | notskill
    MAP_TYPES = map_types
    print(f"허용 어휘 {len(ALLOW):,}개 · 제외어 {len(BLOCK)}개 · 지도 유형 {sorted(MAP_TYPES)}")

    tools, hot = load_onet_tools()
    ncs = load_ncs_terms()
    esco = load_esco_terms()
    print(f"공인 목록 — O*NET 도구 {len(tools):,} (Hot {len(hot)}) · "
          f"NCS 한국어 {len(ncs):,} · ESCO {len(esco):,}")

    df = Counter()
    df_req = Counter()      # 자격요건 절에 등장한 문서 수
    df_pref = Counter()     # 우대사항 절에 등장한 문서 수
    fam = defaultdict(Counter)
    titles = defaultdict(set)
    surface = {}
    all_titles = set()
    n_doc = 0

    with (RAW / "_corpus.jsonl").open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            n_doc += 1
            blob = f"{d['title']} {d['text']}"
            t = d["title"].strip().lower()[:60]
            if t:
                all_titles.add(t)

            # 이 문서에 실제로 있는 여러 단어짜리 도구명만 먼저 추린다
            low = blob.lower()
            mw = {k for k in tools if " " in k and k in low}
            for k in mw:
                surface_hint.setdefault(k, tools[k])

            seen = extract_keys(blob, tools, ncs, mw)
            seen_req = extract_keys(d.get("req_text", ""), tools, ncs, mw)
            seen_pref = extract_keys(d.get("pref_text", ""), tools, ncs, mw)

            def cn(k):
                return canon(k, "ko" if HANGUL.search(k) else "en", tools)

            for k in seen:
                c = cn(k)
                surface.setdefault(c, surface_hint.get(k, k))
                df[c] += 1
                fam[c][d["job_family"]] += 1
                if t:
                    titles[c].add(t)
            for k in seen_req:
                df_req[cn(k)] += 1
            for k in seen_pref:
                df_pref[cn(k)] += 1

    hi = int(n_doc * MAX_DF_RATIO)
    keep = {k: c for k, c in df.items() if MIN_DF <= c <= hi}

    # 대문자 사용 비율로 거른다.
    #   Python  거의 항상 대문자        → 고유명사, 남긴다
    #   build   문장 첫머리에서만 대문자 → 일반 동사, 뺀다
    # 전부 대문자인 약어(AWS·SQL)와 기호를 낀 것(C++·Node.js)은 애매하지 않아 면제한다.
    MIN_CAP_RATIO = 0.7
    dropped_case = []
    for k in list(keep):
        if HANGUL.search(k) or " " in k:
            continue
        name = surface_hint.get(k, k)
        if name.isupper() or SYMBOLIC.match(name) or DOTTED.match(name):
            continue
        n = tok_all.get(k, 0)
        ratio = tok_cap.get(k, 0) / n if n else 0
        if ratio < MIN_CAP_RATIO:
            dropped_case.append((k, n, ratio))
            keep.pop(k)
    dropped_case.sort(key=lambda x: -x[1])
    print(f"대문자 비율 {MIN_CAP_RATIO} 미만으로 제외 {len(dropped_case)}개: "
          + ", ".join(f"{k}({r:.0%})" for k, _, r in dropped_case[:12]))
    print(f"JD {n_doc:,}건 · 후보 {len(df):,} → df {MIN_DF}~{hi:,} 통과 {len(keep):,}")

    n_title = max(len(all_titles), 1)
    recs = []
    for k, c in keep.items():
        f_ = fam[k]
        srcs = []
        if k in tools:
            srcs.append("onet")
        if k in esco:
            srcs.append("esco")
        if surface[k] in ncs:
            srcs.append("ncs")
        recs.append({
            "key": k,
            "name": surface[k],
            "lang": "ko" if HANGUL.search(k) else "en",
            "jd_doc_count": c,
            "jd_families": dict(f_),
            "dominant_family": f_.most_common(1)[0][0],
            "family_share": round(f_.most_common(1)[0][1] / c, 3),
            "family_breadth": len(f_),
            "title_coverage": round(len(titles[k]) / n_title, 5),
            "type": skill_type(k, tools),
            "on_map": skill_type(k, tools) in MAP_TYPES or bool(HANGUL.search(k)),
            "ontology_sources": srcs,
            "hot_technology": k in hot,
            "req_count": df_req.get(k, 0),
            "pref_count": df_pref.get(k, 0),
        })

    # spread = "여러 직무에 넓게 쓰이는가".
    #
    # ⚠️ 앞 판에서는 직무명 커버리지만 썼는데, 그러면 spread 가 사실상 빈도의 복사본이 된다.
    #    많이 나오는 말이 자동으로 넓게 쓰이는 말이 돼버린다. 그건 전이성이 아니다.
    #    그래서 두 가지를 합친다.
    #      ① 직군 엔트로피 — 개발/디자인/기획에 고르게 걸치면 1, 한 직군에만 몰리면 0
    #      ② 직무명 다양성 — 등장 문서 대비 서로 다른 직무명이 얼마나 되는가
    #    Python 은 개발 93% 라 ①이 낮고, '데이터 분석'은 세 직군에 걸쳐 ①이 높다.
    import math

    def entropy(counter):
        tot = sum(counter.values())
        if tot == 0:
            return 0.0
        h = -sum((v / tot) * math.log(v / tot) for v in counter.values() if v)
        return h / math.log(3)          # 직군이 셋이므로 log(3) 으로 정규화

    for r in recs:
        r["family_entropy"] = round(entropy(Counter(r["jd_families"])), 4)
        r["title_diversity"] = round(len(titles[r["key"]]) / r["jd_doc_count"], 4)

    div_sorted = sorted(recs, key=lambda r: r["title_diversity"])
    n = len(recs)
    div_rank = {id(r): (i + 1) / n for i, r in enumerate(div_sorted)}
    for r in recs:
        r["spread"] = round(0.6 * r["family_entropy"] + 0.4 * div_rank[id(r)], 4)

    # ── scarcity(희소성) ────────────────────────────────────────────────
    #
    # "그 스킬을 가진 사람이 얼마나 드문가". 공급(사람) 데이터가 없으므로 대리지표를 쓴다.
    #
    #   공고는 스킬을 두 칸에 나눠 적는다.
    #     자격요건 = 이 정도는 다들 갖고 있어야 함  → 흔하다
    #     우대사항 = 드물어서, 있으면 좋음          → 희소하다
    #   채용담당자가 매긴 희소성이라 볼 수 있다.
    #
    #   scarcity_raw = 우대 등장 / (자격요건 등장 + 우대 등장)
    #
    # ⚠️ 이것은 수요 쪽에서 뽑은 대리지표다. 실제 보유자 비율이 아니다.
    #    개발 직군은 나중에 공급 데이터로 이 값이 맞는지 검증할 수 있다.
    # 관측이 적으면 비율이 요동친다. Excel 은 13건(우대 9/요건 4)만으로 leverage 최상위에 올랐다.
    #
    # 하한을 20으로 잡아 잘라내 봤더니 산출 대상이 372 → 189 로 반토막났다.
    # 그래서 자르지 않고 **전체 평균 쪽으로 당긴다**(축소 추정).
    #   관측이 많으면 자기 비율을 거의 그대로 쓰고, 적으면 평균에 가까워진다.
    MIN_OBS = 3
    PRIOR = 12          # 가상 관측 수. 클수록 저관측 항목이 평균에 더 붙는다.
    tot_pref = sum(r["pref_count"] for r in recs)
    tot_obs = sum(r["req_count"] + r["pref_count"] for r in recs) or 1
    base = tot_pref / tot_obs
    for r in recs:
        obs = r["req_count"] + r["pref_count"]
        r["scarcity_obs"] = obs
        r["scarcity_raw"] = (round((r["pref_count"] + PRIOR * base) / (obs + PRIOR), 4)
                             if obs >= MIN_OBS else None)

    scored = [r for r in recs if r["scarcity_raw"] is not None]
    scored.sort(key=lambda r: r["scarcity_raw"])
    m = len(scored)
    for i, r in enumerate(scored):
        r["scarcity"] = round((i + 1) / m, 4)
    for r in recs:
        r.setdefault("scarcity", None)
        r["scarcity_method"] = "proxy:pref-vs-req" if r["scarcity"] is not None else None

    # ── quadrant ───────────────────────────────────────────────────────
    for r in recs:
        if r["scarcity"] is None:
            r["quadrant"] = None
            continue
        wide, rare = r["spread"] >= 0.5, r["scarcity"] >= 0.5
        r["quadrant"] = ("leverage" if wide else "lockin") if rare else \
                        ("common" if wide else "noise")

    recs.sort(key=lambda r: -r["jd_doc_count"])
    OUT.write_text(json.dumps({
        "method": "형태·공인목록으로 후보를 정하고 JD 로 빈도를 센다",
        "jd_docs": n_doc, "jd_titles": n_title,
        "spread_definition": "직무명 커버리지의 백분위 순위 (0~1)",
        "scarcity_definition": "우대사항 등장 / (자격요건 + 우대사항) 등장의 백분위 순위. 수요 쪽 대리지표이며 실제 보유자 비율이 아니다.",
        "quadrant_boundary": 0.5,
        "type_note": "language·tool·concept·domain 은 2×2 지도에 올린다. "
                     "certification·office 는 성격이 달라 부가 정보로 따로 보여준다. "
                     "skill_ko 는 한국어 어휘로, 허용 목록(영문)으로는 유형을 못 매긴다.",
        "skills": recs,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"사전 {len(recs):,}개 → {OUT.name}")


if __name__ == "__main__":
    run()
