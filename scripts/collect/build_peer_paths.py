"""「이 길도 있어요」의 근거 — "당신과 같은 기술을 가진 사람들이 실제로 하는 직무".

왜 이걸 쓰나
  지금 히든 경로는 **우리가 만든 규칙**에 기댄다 — "그 직무 필수 중 직군을 넘나드는 역량 2개 이상".
  규칙이라 근거가 약하고, 우리 공고 표본(직무당 5~280건)이 좁아 못 보는 경로가 있다.

  설문 자료는 사람들이 **실제로** 그 기술 묶음을 갖고 그 직무를 하고 있다는 사실이다.
  화면에 이렇게 말할 수 있다 — "이 기술 조합을 가진 1,432명 중 38%가 이 직무입니다".

왜 주 순위에는 안 쓰나
  응답자가 Stack Overflow 커뮤니티라 서구 비중이 높다. 국내 채용 시장과 다를 수 있다.
  주 순위는 국내 근거(공고·해설 글·NCS)로 두고, 이 자료는 **"몰랐던 길"을 보여주는 데만** 쓴다.
  국내 공고에 없는 경로가 나오면 그건 정보지 오류가 아니다. 편중이 여기서는 단점이 덜하다.

  ⚠️ 개발 직무만 담는다. 설문으로는 기획·디자인이 갈리지 않는다
     (프로덕트 디자이너 171명의 상위 기술이 Figma 가 아니라 JavaScript 64% · HTML/CSS 65% 였다).

⚠️ 라이선스
  원본은 ODbL 1.0. 여기서 만드는 표는 **파생 데이터베이스**다.
  공개 배포하면 동일조건(share-alike)과 출처 표시가 걸린다 — 배포 전에 정리해야 한다(이슈 #14).
  지금은 data/interim 에 두어 로컬에서 동작만 확인한다.

산출: data/interim/peer-paths.json
"""
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW, word_pattern  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data" / "interim"
OUT = D / "peer-paths.json"

# 설문으로 구분이 되는 직무만. 나머지는 규칙이 맡는다.
SCORABLE = {
    "be_dev", "fe_dev", "fullstack_dev", "mobile_dev", "embedded_dev", "sw_eng",
    "data_eng", "data_scientist", "data_analyst", "devops_sre", "security_eng", "qa_eng",
}
# 직무를 가리지 않는 도구. 남겨 두면 모든 사람이 서로 닮는다.
UBIQUITOUS = {
    "Visual Studio Code", "Visual Studio", "Notepad++", "IntelliJ IDEA", "Vim", "Neovim",
    "ChatGPT", "GitHub Copilot", "Microsoft Teams", "Slack", "Discord", "Zoom", "Google Meet",
    "Jira", "Confluence", "Notion", "Markdown File", "npm", "Pip", "Homebrew",
    "Windows", "MacOS", "Google Workspace", "Whatsapp", "Telegram",
}
MIN_SUPPORT = 30      # 이보다 적은 사람이 가진 역량은 근거로 쓰지 않는다


def run():
    src = RAW / "survey" / "profiles.jsonl"
    if not src.exists():
        raise SystemExit("profiles.jsonl 이 없다. 먼저 collect_survey.py 를 실행할 것.")

    skills = json.loads((D / "skills.json").read_text(encoding="utf-8"))
    pats = [(word_pattern(t), s["id"])
            for s in skills for t in [s["name"]] + list(s.get("aliases") or []) if len(t) >= 2]
    cache: dict = {}

    def resolve(name):
        if name not in cache:
            cache[name] = next((sid for p, sid in pats if p.search(name)), None)
        return cache[name]

    #  역량 하나마다 "그 역량을 가진 사람들의 직무 분포"를 만든다.
    #  이게 있으면 어떤 기술 묶음이든 직무 분포를 더해서 볼 수 있다.
    per_skill = defaultdict(Counter)
    total = Counter()
    n_rows = 0
    for line in src.open(encoding="utf-8"):
        if not line.strip():
            continue
        r = json.loads(line)
        if r["jobId"] not in SCORABLE:
            continue
        ids = {resolve(x) for x in r["skills"] if x not in UBIQUITOUS} - {None}
        if len(ids) < 3:
            continue
        n_rows += 1
        total[r["jobId"]] += 1
        for sid in ids:
            per_skill[sid][r["jobId"]] += 1

    table = {}
    for sid, c in per_skill.items():
        n = sum(c.values())
        if n < MIN_SUPPORT:
            continue
        table[sid] = {"n": n, "jobs": {j: round(v / n, 4) for j, v in c.most_common()}}

    OUT.write_text(json.dumps({
        "note": "이 역량을 가진 사람들이 실제로 하는 직무의 분포. 「이 길도 있어요」의 근거로만 쓴다.",
        "source": "Stack Overflow Developer Survey (ODbL 1.0) — 파생 데이터베이스",
        "attribution": "Stack Overflow Developer Survey · https://survey.stackoverflow.co/",
        "caveat": "응답자가 Stack Overflow 커뮤니티라 서구 비중이 높다. 주 순위에는 쓰지 않는다.",
        "respondents": n_rows,
        "jobs": {j: total[j] for j in sorted(total, key=lambda x: -total[x])},
        "minSupport": MIN_SUPPORT,
        "skills": table,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"응답 {n_rows:,}건 · 직무 {len(total)}개 · 역량 {len(table):,}개 "
          f"(가진 사람 {MIN_SUPPORT}명 미만 제외)")
    ex = sorted(table.items(), key=lambda x: -x[1]["n"])[:5]
    by_id = {s["id"]: s["name"] for s in skills}
    for sid, v in ex:
        top = list(v["jobs"].items())[:3]
        print(f"   {by_id.get(sid, sid):16} {v['n']:>6,}명  "
              + " · ".join(f"{j} {p:.0%}" for j, p in top))
    print(f"→ {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    run()
