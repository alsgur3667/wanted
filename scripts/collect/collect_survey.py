"""채점용 표본 — Stack Overflow 개발자 설문.

왜 필요한가
  지금 추천 품질은 **내가 직무마다 '전형적인 이력서'를 손으로 만들어** 1위가 맞는지 보고 있다.
  내가 만든 정답을 내가 채점하는 셈이고, 표본도 24개뿐이라 한 건이 4% 를 흔든다.
  실제로 근거를 늘렸을 때 목록 품질은 분명히 좋아졌는데 적중은 18 → 17 로 "떨어졌다".
  **지표가 개선을 못 잡아낸다.**

왜 이 자료인가
  ① 응답자가 자기 직무(DevType)와 실제로 쓰는 기술을 직접 적었다 — (기술 묶음 → 직무) 쌍이다.
  ② **우리가 요구 역량을 만든 자료와 완전히 독립**이다.
     요구 역량 = 채용공고 + 직무 해설 글 + O*NET/NCS.  이 설문은 그 어느 것도 아니다.
     같은 자료로 만들고 같은 자료로 채점하면 자기 채점이라 의미가 없다.
  ③ 개인 식별정보를 쓰지 않는다. 직무와 기술 목록 두 칸만 읽는다.

라이선스
  ODbL 1.0 (데이터베이스) · DbCL 1.0 (개별 값). 출처 표시 + 배포 시 동일조건.
  → **재배포하지 않는다.** 원본과 파생 표본은 data/raw/ 에만 두고 커밋하지 않는다.
     저장소에는 이 스크립트와 채점 결과 숫자만 남긴다.

산출: data/raw/survey/profiles.jsonl  (커밋하지 않음)
"""
import csv
import io
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW, now_kst, polite_get, robots_allowed  # noqa: E402

OUT = RAW / "survey"
YEARS = ["2024", "2025"]
#  ⚠️ raw.githubusercontent.com 은 **Git LFS 포인터**(134바이트)를 준다. 실제 파일은 140MB 다.
#     media.githubusercontent.com 이 LFS 실물을 준다.
BASE = ("https://media.githubusercontent.com/media/StackExchange/Survey/main/"
        "packages/archive/{}/results.csv")

# 설문의 DevType → 우리 직무 id.
#   손으로 맞췄다. 애매한 것(Student, Other, Academic researcher)은 버린다 —
#   억지로 붙이면 채점표가 오염된다.
DEVTYPE = {
    "Developer, back-end": "be_dev",
    "Developer, front-end": "fe_dev",
    "Developer, full-stack": "fullstack_dev",
    "Developer, mobile": "mobile_dev",
    "Developer, embedded applications or devices": "embedded_dev",
    "Developer, desktop or enterprise applications": "sw_eng",
    "Developer, game or graphics": "sw_eng",
    "Data engineer": "data_eng",
    "Data scientist or machine learning specialist": "data_scientist",
    "Data or business analyst": "data_analyst",
    "Engineering manager": "eng_lead",
    "Senior Executive (C-Suite, VP, etc.)": "eng_lead",
    "DevOps specialist": "devops_sre",
    "Site reliability engineer": "devops_sre",
    "Cloud infrastructure engineer": "devops_sre",
    "System administrator": "devops_sre",
    "Security professional": "security_eng",
    "Developer, QA or test": "qa_eng",
    "QA or test": "qa_eng",
    "Database administrator": "data_eng",
    "Product manager": "product_manager",
    "Project manager": "program_manager",
    "Designer": "product_designer",
    "Research & Development role": "architect",
    "Blockchain": "be_dev",
    "Hardware Engineer": "embedded_dev",
    "Developer Experience": "devops_sre",
    "Developer Advocate": "solutions_eng",
}

# 기술이 적힌 칸. 설문 해마다 이름이 조금씩 다르다.
TECH_COLS = [
    "LanguageHaveWorkedWith", "DatabaseHaveWorkedWith", "PlatformHaveWorkedWith",
    "WebframeHaveWorkedWith", "MiscTechHaveWorkedWith", "ToolsTechHaveWorkedWith",
    "NEWCollabToolsHaveWorkedWith", "OpSysProfessional use", "EmbeddedHaveWorkedWith",
    "AISearchDevHaveWorkedWith", "OfficeStackSyncHaveWorkedWith",
]


def run():
    #  자유 서술 칸에 아주 긴 답이 있어 csv 기본 한도(131,072자)를 넘는다.
    #  2025 자료에서 실제로 걸렸다. 우리는 그 칸을 읽지 않지만 파서는 통과해야 한다.
    csv.field_size_limit(10_000_000)
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for year in YEARS:
        url = BASE.format(year)
        if not robots_allowed(url):
            print(f"  {year} robots.txt 불허 — 건너뜀")
            continue
        print(f"  {year} 내려받는 중…", flush=True)
        try:
            r = polite_get(url, timeout=300)
        except Exception as e:
            print(f"  {year} 실패 {type(e).__name__}: {e}")
            continue
        if r.status_code != 200:
            print(f"  {year} HTTP {r.status_code}")
            continue
        if r.content[:40].startswith(b"version https://git-lfs"):
            raise SystemExit("LFS 포인터가 내려왔다 — media.githubusercontent.com 을 써야 한다")
        text = r.content.decode("utf-8", errors="replace")
        print(f"  {year} 내려받음 {len(r.content)/1048576:.0f}MB", flush=True)
        rd = csv.DictReader(io.StringIO(text))
        #  설문은 해마다 칸 이름을 바꾼다. 고정 목록으로 찾으면 0건이 된다(실제로 그랬다).
        #  "…HaveWorkedWith" 로 끝나는 칸을 전부 쓴다 — 그게 '실제로 써 본 기술' 칸이다.
        fields = rd.fieldnames or []
        cols = [c for c in fields if c.endswith("HaveWorkedWith")]
        if not cols:
            cols = [c for c in TECH_COLS if c in fields]
        print(f"  {year} 기술 칸 {len(cols)}개: {', '.join(cols[:6])}…", flush=True)
        n_dev = 0
        for row in rd:
            # DevType 은 여러 개가 ; 로 붙는다. 첫 번째만 쓴다 — 주 직무로 본다.
            dev = (row.get("DevType") or "").split(";")[0].strip()
            jid = DEVTYPE.get(dev)
            if not jid:
                continue
            skills = set()
            for c in cols:
                for v in (row.get(c) or "").split(";"):
                    v = v.strip()
                    if v and v.lower() not in ("na", "nan", ""):
                        skills.add(v)
            if len(skills) < 3:          # 기술을 거의 안 적은 응답은 채점에 못 쓴다
                continue
            rows.append({"year": year, "jobId": jid, "devType": dev,
                         "skills": sorted(skills)})
            n_dev += 1
        print(f"  {year} 사용 가능한 응답 {n_dev:,}건 (기술 칸 {len(cols)}개)")

    (OUT / "profiles.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8")
    (OUT / "_meta.json").write_text(json.dumps({
        "collected_at": now_kst(),
        "source": "Stack Overflow Developer Survey",
        "source_url": "https://survey.stackoverflow.co/",
        "license": "ODbL 1.0 (database) / DbCL 1.0 (contents) — 재배포하지 않음",
        "note": "채점 전용. 요구 역량 생성에는 쓰지 않는다 (자기 채점 방지).",
        "years": YEARS, "rows": len(rows),
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    c = Counter(r["jobId"] for r in rows)
    print(f"\n채점 표본 {len(rows):,}건 · 직무 {len(c)}개")
    for k, v in c.most_common():
        print(f"   {k:18}{v:>7,}건")
    print(f"→ {(OUT / 'profiles.jsonl').relative_to(RAW)}  (커밋하지 않음)")


if __name__ == "__main__":
    run()
