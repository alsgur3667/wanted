"""직군 분류 — 개발 / 디자인 / 기획 세 갈래. 그 밖은 None(수집 제외)."""
import re

# 순서가 곧 우선순위다. "Product Designer" 는 디자인, "Product Manager" 는 기획으로 가야 한다.
RULES = [
    ("디자인", r"designer|(^|\W)design(\W|$)|design ops|\bux\b|\bui\b|user experience|"
               r"visual|graphic|brand design|motion|illustrat|디자이너|디자인"),
    ("기획",   r"product manager|program manager|project manager|product owner|(^|\W)pm(\W|$)|"
               r"(^|\W)po(\W|$)|business analyst|strategy|planner|기획|프로덕트 매니저|서비스 기획"),
    ("개발",   r"engineer|developer|backend|back-end|frontend|front-end|full[ -]?stack|software|"
               r"programmer|android|\bios\b|mobile dev|devops|\bsre\b|platform|infrastructure|"
               r"machine learning|\bml\b|\bai\b|data scien|data engineer|security|\bqa\b|"
               r"embedded|architect|개발|엔지니어"),
]

# 명백히 다른 직군 — 먼저 걸러낸다.
EXCLUDE = re.compile(
    r"recruit|talent acquisition|human resource|(^|\W)hr(\W|$)|payroll|accountant|"
    r"controller|legal counsel|attorney|customer support|customer success|"
    r"account executive|sales development|(^|\W)sdr(\W|$)|teacher|nurse|driver|warehouse",
    re.I,
)

COMPILED = [(fam, re.compile(pat, re.I)) for fam, pat in RULES]


def job_family(title: str, extra: str = "") -> str | None:
    """직무명(필요 시 태그·카테고리 보조)으로 직군을 판정한다. 해당 없으면 None."""
    t = title or ""
    if EXCLUDE.search(t):
        return None
    for fam, pat in COMPILED:
        if pat.search(t):
            return fam
    blob = f"{t} {extra}"
    for fam, pat in COMPILED:
        if pat.search(blob):
            return fam
    return None
