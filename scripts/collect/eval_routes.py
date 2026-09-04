"""추천이 맞는지 **독립 자료로** 채점한다.

무엇을 재나
  Stack Overflow 개발자 설문 응답자의 (실제 쓰는 기술 → 본인 직무) 쌍을 넣고,
  우리 로직이 그 사람의 직무를 1위로 맞히는지 본다.

왜 이 자료인가
  우리가 요구 역량을 만든 자료(채용공고 · 직무 해설 글 · O*NET/NCS)와 **독립**이다.
  같은 자료로 만들고 같은 자료로 채점하면 자기 채점이라 아무것도 증명하지 못한다.

⚠️ 이 파일은 앱(lib/scoring.ts)의 계산을 **파이썬으로 옮겨 적은 것**이다.
   앱을 고치면 여기도 고쳐야 한다. 어긋나면 채점이 거짓말을 한다.
   상수는 아래 한곳에 모아 두었으니 앱의 값과 대조할 것.

⚠️ 설문 원본과 파생 표본은 재배포하지 않는다(ODbL). data/raw/ 에만 두고 커밋하지 않는다.
"""
import json
import math
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW, word_pattern  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data" / "interim"

# ── 앱과 맞춰야 하는 상수 (lib/scoring.ts · lib/skill-index.ts) ──────────
MUST_W, NICE_W, STRENGTH_W = 3, 1, 2
MUST_REL = 0.4               # 그 직무 최고 강도 대비 이 이상이면 필수
MUST_MIN, MUST_MAX, NICE_MAX = 3, 8, 6
LIFT_CAP = 3.0
CONFIDENCE_N = 20
UNIQ_FLOOR = 0.6             # 직무 고유성 보정의 바닥값
CONT_PENALTY = 0.35          # 남의 직무에 통째로 흡수되는 만큼 깎는다

MAX_PER_JOB = 300      # 직무마다 이만큼만 뽑는다. 응답 수가 많은 직무가 채점을 지배하지 않도록.

# ── 이 자료로 채점할 수 있는 직무 ────────────────────────────────────
#
#  설문은 "업무에 필요한 기술"이 아니라 **"써 본 기술 전부"**를 묻는다.
#  응답자도 개발자 커뮤니티라 PM·디자이너도 대부분 코딩을 한다. 그래서 프로필이 갈리지 않는다.
#
#  실측 — 프로덕트 디자이너 171명의 상위 기술이 Figma 가 아니라 JavaScript(64%)·HTML/CSS(65%) 였다.
#         풀스택과의 상위 기술 겹침: 프로그램 매니저 71% · QA 67% · PM 62% · 디자이너 54%
#         **백엔드 개발자(58%)보다도 높다.** 어떤 로직으로도 갈라낼 수 없다 — 정보가 없다.
#
#  그래서 이 자료로는 **개발 직무의 변별력만** 잰다. 비개발 직무 점수는 로직의 실패가 아니라
#  자료의 한계다. 0% 를 우리 성적표에 올리면 그 자체가 거짓말이 된다.
SCORABLE = {
    "be_dev", "fe_dev", "fullstack_dev", "mobile_dev", "embedded_dev", "sw_eng",
    "data_eng", "data_scientist", "data_analyst", "devops_sre", "security_eng", "qa_eng",
}

#  직무를 가리지 않는 도구는 채점에서 뺀다. 남겨 두면 모든 프로필이 서로 닮는다.
#  (설문 상위에 VS Code·ChatGPT·Teams·Discord·Zoom 이 공통으로 올라온다)
UBIQUITOUS = {
    "Visual Studio Code", "Visual Studio", "Notepad++", "IntelliJ IDEA", "Vim", "Neovim",
    "ChatGPT", "GitHub Copilot", "Microsoft Teams", "Slack", "Discord", "Zoom", "Google Meet",
    "Jira", "Confluence", "Notion", "Markdown File", "npm", "Pip", "Homebrew",
    "Windows", "MacOS", "Google Workspace", "Whatsapp", "Telegram",
}


def load():
    J = {j["id"]: j for j in json.loads((D / "jobs.json").read_text(encoding="utf-8"))}
    S = {s["id"]: s for s in json.loads((D / "skills.json").read_text(encoding="utf-8"))}
    M = json.loads((D / "job-skills.json").read_text(encoding="utf-8"))
    G = json.loads((D / "skill-groups.json").read_text(encoding="utf-8"))
    return J, S, M, G


def build_index(S, M, G):
    per_job, per_skill = defaultdict(list), defaultdict(list)
    for m in M:
        per_job[m["jobId"]].append(m)
        per_skill[m["skillId"]].append(m)

    def imp(m):
        return (m.get("importance") or m.get("evidence") or m["weight"])             * min(LIFT_CAP, m.get("lift") or 1)
    for v in per_job.values():
        v.sort(key=lambda m: -imp(m))

    claim = {}
    for sid, rows in per_skill.items():
        tot = sum(r["weight"] for r in rows) or 1
        for r in rows:
            claim[(r["jobId"], sid)] = r["weight"] / tot

    name2id = {s["name"]: i for i, s in S.items()}
    grp = {name2id[n]: k for k, g in G.items() for n in g["skills"] if n in name2id}
    return per_job, claim, grp


def resolver(S):
    """설문의 기술 이름 → 우리 skillId.

    표기가 다르다 — 설문은 "Amazon Web Services (AWS)", 우리는 "AWS".
    낱말 단위로 찾는다. 부분 문자열로 맞추면 community 안의 unity 를 잡는다.
    """
    pats = []
    for s in S.values():
        for t in [s["name"]] + list(s.get("aliases") or []):
            if len(t) >= 2:
                pats.append((word_pattern(t), s["id"]))

    cache = {}

    def resolve(name: str):
        if name in cache:
            return cache[name]
        hit = next((sid for p, sid in pats if p.search(name)), None)
        cache[name] = hit
        return hit
    return resolve


def evaluate(profiles, J, S, M, G, verbose=True):
    per_job, claim, grp = build_index(S, M, G)
    Sname = {sid: v["name"] for sid, v in S.items()}
    resolve = resolver(S)

    def imp(m):
        return (m.get("importance") or m.get("evidence") or m["weight"])             * min(LIFT_CAP, m.get("lift") or 1)

    def reqs(jid):
        rows = per_job[jid]                      # 이미 강도 순
        top = max((imp(r) for r in rows), default=0) or 1
        #  pinned = 사람이 점검판에서 필수로 못 박은 줄. 앱과 같게 문턱을 면제한다.
        must = [r for r in rows
                if r.get("tier") == "required" and (r.get("pinned") or imp(r) >= top * MUST_REL)]
        if len(must) < MUST_MIN:
            must = rows[:MUST_MIN]
        must = sorted(must, key=lambda r: not r.get("pinned"))[:MUST_MAX]
        ms = {r["skillId"] for r in must}
        nice = [r for r in rows
                if r["skillId"] not in ms and (r.get("tier") == "preferred" or imp(r) >= top * 0.2)]
        return [r["skillId"] for r in must], [r["skillId"] for r in nice[:NICE_MAX]]

    # ── 직무 자체의 성격 보정 — 앱(lib/skill-index.ts JOB_ADJUST)과 같은 계산 ──
    #
    #  ⚠️ 이게 빠져 있었다. 앱은 넓은 직무를 깎아 순위를 내는데 채점기는 안 깎아,
    #     **자와 제품이 다른 점수를 냈다.** 이 자로 고른 결정들이 제품과 어긋날 수 있었다.
    #     넓은 직무를 안 깎으면 오답이 전부 풀스택으로 쏠린다 — 실제로 그렇게 나왔다.
    all_reqs = {jid: reqs(jid) for jid in per_job}
    in_must = Counter(s for must, _ in all_reqs.values() for s in must)
    uniq = {jid: (sum(1 / (in_must[s] or 1) for s in must) / len(must) if must else 0)
            for jid, (must, _) in all_reqs.items()}
    lo, hi = min(uniq.values(), default=0), max(uniq.values(), default=0)
    adjust = {}
    for jid, (must, _nice) in all_reqs.items():
        contained = 0.0
        for other, (om, on) in all_reqs.items():
            if other == jid or not must:
                continue
            cover = set(om) | set(on)
            contained = max(contained, sum(s in cover for s in must) / len(must))
        u = ((uniq[jid] - lo) / (hi - lo)) if hi > lo else 0.5
        adjust[jid] = (UNIQ_FLOOR + (1 - UNIQ_FLOOR) * u) * (1 - CONT_PENALTY * contained)
    mx_adj = max(adjust.values(), default=0) or 1
    adjust = {k: v / mx_adj for k, v in adjust.items()}

    def covered(req, have):
        ok = {grp[i] for i in have if i in grp}
        return [i for i in req if i in have or (i in grp and grp[i] in ok)]

    #  요구 비율 — 충족률의 무게. 앱의 demandOf 와 같은 값이다.
    demand = {(m["jobId"], m["skillId"]): m["weight"] for m in M}

    def coverage(jid, req, have):
        """칸을 세지 않고 **무게를 더한다** — 앱(skill-index.coverage)과 같은 계산.

        ⚠️ 칸을 세면 택일 묶음이 칸을 부풀린다. 프론트엔드 필수 8개 중 셋이 한 묶음이라
           Angular 하나 가진 사람이 세 칸을 채웠다(2개 역량으로 4/8).
           목록에서 둘을 빼면 공짜 칸이 사라져 2/6 이 된다 — 사람은 그대로인데 점수가 변한다.
        ⚠️ 무게는 강도가 아니라 **요구 비율**이다. 강도는 lift 상한 3 에 눌려
           94% 짜리와 50% 짜리가 같아진다 (모바일 Android 3.000 · UX/UI 2.826).
        """
        if not req:
            return 0.0
        ok = {grp[i] for i in have if i in grp}
        slots, at = [], {}
        for i in req:
            w = demand.get((jid, i), 0.0)
            g = grp.get(i)
            if g is None:
                slots.append(([i], w))
            elif g in at:
                mem, cw = slots[at[g]]
                mem.append(i)
                slots[at[g]] = (mem, max(cw, w))
            else:
                at[g] = len(slots)
                slots.append(([i], w))
        tot = sum(w for _, w in slots)
        if not tot:
            return 0.0
        got = sum(w for mem, w in slots
                  if any(i in have or (i in grp and grp[i] in ok) for i in mem))
        return got / tot

    def fit_all(have):
        st = {j: (sum(claim.get((j, s), 0) for s in have) / len(have) if have else 0)
              for j in per_job}
        mx = max(st.values(), default=0)
        out = []
        for jid in per_job:
            must, nice = reqs(jid)
            mc = coverage(jid, must, have)
            nc = coverage(jid, nice, have)
            rel = st[jid] / mx if mx else 0
            raw = 100 * (mc * MUST_W + nc * NICE_W + rel * STRENGTH_W) / (MUST_W + NICE_W + STRENGTH_W)
            conf = min(1, math.sqrt(J[jid]["sampleSize"] / CONFIDENCE_N))
            out.append((round(raw * conf * adjust[jid]), jid))
        out.sort(reverse=True)
        return out

    top1 = top3 = 0
    by_job = defaultdict(lambda: [0, 0, 0])       # [건수, top1, top3]
    confusion = Counter()
    unresolved = Counter()
    seen_skill = Counter()                        # 응답에 실제로 나온 역량
    for p in profiles:
        have = set()
        for nm in p["skills"]:
            sid = resolve(nm)
            if sid:
                have.add(sid)
                seen_skill[sid] += 1
            else:
                unresolved[nm] += 1
        if len(have) < 3:
            continue
        ranked = fit_all(have)
        got = [j for _, j in ranked[:3]]
        want = p["jobId"]
        by_job[want][0] += 1
        if got and got[0] == want:
            top1 += 1
            by_job[want][1] += 1
        else:
            confusion[(want, got[0] if got else None)] += 1
        if want in got:
            top3 += 1
            by_job[want][2] += 1

    n = sum(v[0] for v in by_job.values())
    if verbose and n:
        print(f"\n채점 표본 {n:,}건 — 1위 정답 {top1 / n:.1%} · 3위 안 {top3 / n:.1%}\n")
        print(f"  {'직무':20}{'표본':>7}{'1위':>8}{'3위 안':>9}")
        for jid, (c, t1, t3) in sorted(by_job.items(), key=lambda x: -x[1][0]):
            print(f"  {J[jid]['title'][:18]:20}{c:>7,}{t1 / c:>8.0%}{t3 / c:>9.0%}")
        #  ⚠️ 0% 를 곧바로 '우리 점수가 틀렸다'로 읽으면 안 된다.
        #     설문은 언어·DB·클라우드·프레임워크를 묻지, 테스트 도구나 업무 역량은 묻지 않는다.
        #     QA 는 필수 4개(Selenium·Playwright·Cypress·UX/UI)가 하나도 응답에 안 나온다.
        #     그런 직무는 이 자로 잴 수 없는 것이지, 우리 점수가 나쁜 것이 아니다.
        blind = []
        for jid in by_job:
            must, _ = reqs(jid)
            vis = sum(1 for x in must if seen_skill[x] >= 30)
            if must and vis < len(must) * 0.6:
                blind.append((jid, vis, len(must),
                              [Sname.get(x, x) for x in must if seen_skill[x] < 30]))
        if blind:
            print()
            print("  ⚠️ 이 자로는 잘 못 재는 직무 — 필수 역량이 설문 문항에 없다")
            for jid, vis, tot, names in sorted(blind, key=lambda x: x[1] / x[2]):
                print(f"    {J[jid]['title'][:16]:18} 보이는 필수 {vis}/{tot}"
                      f"   안 보임: {' · '.join(names)}")
        print("\n  자주 틀리는 방향 (정답 → 우리가 고른 것)")
        for (w, g), c in confusion.most_common(8):
            print(f"    {J[w]['title'][:16]:18} → {J[g]['title'][:16] if g else '없음':18}{c:>6,}건")
        print(f"\n  사전에 없어 버린 설문 기술 상위: "
              f"{', '.join(k for k, _ in unresolved.most_common(12))}")
    return {"n": n, "top1": top1 / n if n else 0, "top3": top3 / n if n else 0}


def run():
    src = RAW / "survey" / "profiles.jsonl"
    if not src.exists():
        raise SystemExit("profiles.jsonl 이 없다. 먼저 collect_survey.py 를 실행할 것.")
    rows = [json.loads(l) for l in src.open(encoding="utf-8") if l.strip()]
    J, S, M, G = load()
    rows = [r for r in rows if r["jobId"] in J and r["jobId"] in SCORABLE]
    for r in rows:
        r["skills"] = [x for x in r["skills"] if x not in UBIQUITOUS]

    by = defaultdict(list)
    for r in rows:
        by[r["jobId"]].append(r)
    rnd = random.Random(20260903)          # 고정 씨앗 — 돌릴 때마다 점수가 흔들리면 비교가 안 된다
    sample = []
    for jid, v in by.items():
        rnd.shuffle(v)
        sample.extend(v[:MAX_PER_JOB])
    print(f"설문 응답 {len(rows):,}건 (채점 가능 직무 {len(SCORABLE)}개로 한정) "
          f"→ 직무당 최대 {MAX_PER_JOB}건 추출 {len(sample):,}건")
    print("  ⚠️ 비개발 직무(PM·디자이너·매니저)는 이 자료로 채점하지 않는다 — 위 주석 참조")
    evaluate(sample, J, S, M, G)


if __name__ == "__main__":
    run()
