"""검증 화면(docs/skill-map.html)의 데이터를 다시 만든다.

왜 스크립트로 만드나
  이 화면의 데이터를 처음에는 손으로 박아 넣었다. 그러면 데이터를 갱신할 때마다
  화면이 옛 숫자를 보여주고, 그게 더 나쁘다 — 틀린 줄 모르고 보게 된다.
  화면 뼈대(HTML·CSS·JS)는 그대로 두고 **payload 블록과 머리말 숫자만** 갈아 끼운다.

두 가지 축 계산 방식을 같이 실어서 화면에서 토글로 비교하게 한다.
  ① 계약 방식   scarcity = ln(전체 직무수 / 이 스킬이 나온 직무수) / ln(전체 직무수)
  ② 제안 방식   scarcity = 우대사항 등장 / (자격요건 + 우대사항) 등장 의 백분위
                (경험적 베이즈로 축소, mine_vocab.py 참조)

  가로축은 두 방식이 같다 — 계약이 정의한 spread(스킬이 등장하는 **직무 분포의 엔트로피**)를
  그대로 쓴다. 계약에서 다시 볼 것은 scarcity 정의 하나다.
  상관계수는 여기서 실측해 화면 문구에 그대로 넣는다 — 손으로 적어 두면 어긋난다.
"""
import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import RAW  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
PAGE = REPO / "docs" / "skill-map.html"


def pearson(xs, ys):
    n = len(xs)
    if n < 3:
        return 0.0
    mx, my = sum(xs) / n, sum(ys) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    sxx = sum((a - mx) ** 2 for a in xs)
    syy = sum((b - my) ** 2 for b in ys)
    return sxy / math.sqrt(sxx * syy) if sxx and syy else 0.0


def check_payload(srows, jrows):
    """payload 의 키가 뜻대로 들어갔는지 산출 시점에 막는다.

    키가 짧아 부딪히기 쉽다. 실제로 표본 수를 "n" 으로 넣어 스킬 이름("n")을 덮은 적이 있다 —
    화면에 스킬 이름 대신 숫자가 나왔고, JSON 은 잘 만들어졌기 때문에 아무 오류도 안 났다.
    조용히 틀리는 종류라 여기서 잡는다.

    규칙: 사람이 읽는 이름은 문자열, 세는 값은 posts. 한 payload 에서 같은 키가 두 뜻을 갖지 않는다.
    """
    for r in srows:
        if not isinstance(r.get("n"), str):
            raise SystemExit(f"payload 키 충돌 — skills[].n 은 스킬 이름이어야 한다 (받은 값: {r.get('n')!r})")
        if not isinstance(r.get("posts"), int):
            raise SystemExit(f"payload — skills[].posts 는 정수여야 한다 (받은 값: {r.get('posts')!r})")
    for r in jrows:
        if not isinstance(r.get("title"), str) or not isinstance(r.get("posts"), int):
            raise SystemExit(f"payload — jobs[] 의 title 은 문자열, posts 는 정수여야 한다: {r!r}")


def run():
    jobs = json.loads((REPO / "data" / "jobs.json").read_text(encoding="utf-8"))
    skills = json.loads((REPO / "data" / "skills.json").read_text(encoding="utf-8"))
    matrix = json.loads((REPO / "data" / "job-skills.json").read_text(encoding="utf-8"))
    adj = json.loads((REPO / "data" / "job-adjacency.json").read_text(encoding="utf-8"))
    adj = adj["edges"] if isinstance(adj, dict) else adj
    roles_src = json.loads((RAW / "_roles.json").read_text(encoding="utf-8"))
    # ⚠️ spread·scarcity 는 required_skills(5% 문턱)로 재면 안 된다.
    #    여러 직무에서 3%씩 쓰이는 스킬이 어디에서도 안 잡혀 '직무 1개'가 되고 엔트로피가 0 이 된다.
    #    실측 — 문턱을 걸면 스킬의 43%가 직무 1개에만 걸리고 전이성 중앙값 0.158,
    #           문턱 없이 세면 6% · 0.419 다. 지도가 통째로 왼쪽에 눌어붙는다.
    job_dist = roles_src.get("skill_job_dist", {})
    title_to_id = {}
    mined = json.loads((RAW / "_skills.json").read_text(encoding="utf-8"))
    mined = mined if isinstance(mined, list) else mined.get("skills", [])
    by_key = {m["key"]: m for m in mined}

    def mined_rows(sk):
        """계약 스킬 하나에 대응하는 채굴 기록들.

        표기 통합으로 여러 이름이 하나로 합쳐졌다(UX/UI ← UX·UI, AI 코딩 도구 ← Claude·Cursor…).
        대표 이름으로만 찾으면 그런 스킬의 통계가 전부 0 으로 나온다 — 화면에 "공고 0건"으로
        보이는데 실제로는 수백 건이다. 흡수된 이름(aliases)까지 모아서 더한다.
        """
        keys = [sk["name"].lower()] + [a.lower() for a in (sk.get("aliases") or [])]
        seen, out = set(), []
        for k in keys:
            r = by_key.get(k)
            if r and id(r) not in seen:
                seen.add(id(r))
                out.append(r)
        return out

    n_jobs = len(jobs)
    title_to_id = {j["title"]: j["id"] for j in jobs}
    job_n = {}
    for m in matrix:
        job_n[m["jobId"]] = job_n.get(m["jobId"], 0) + 1
    per_skill_jobs = {}
    for m in matrix:
        per_skill_jobs.setdefault(m["skillId"], set()).add(m["jobId"])

    # ── 엔트로피를 무엇으로 나눌 것인가 ──────────────────────────────────
    #
    # 처음에는 ln(직무 수) 로 나눴다. 스킬이 24개 직무에 **균등하게** 퍼졌을 때의 값이다.
    # 그런데 직무 표본이 280건~5건으로 제각각이라 그런 분포는 만들어질 수가 없다.
    # 모든 직무에서 똑같은 비율로 쓰이는 스킬조차 직무 규모 분포를 따를 뿐이고,
    # 그 엔트로피는 ln(24)=3.178 이 아니라 2.696 이다.
    #
    # 결과 — 축의 오른쪽 15%가 구조적으로 비었다. 지도를 보면 바로 보인다.
    #        실제 최대가 0.778 인데 0~1 을 폭 전체에 그리니 오른쪽이 늘 허전했다.
    #
    # 그래서 **도달 가능한 상한**으로 나눈다. 1.0 = "모든 직무에서 그 직무 규모에 비례해 쓰인다"
    # = 가장 전이성이 높은 상태다. 눈금에 뜻이 생긴다.
    #
    # 낮은 확률로 1 을 넘을 수 있다(작은 직무에까지 큰 직무와 같은 '건수'로 나오는 경우).
    # 지금 데이터에는 없지만 넘으면 1 로 자른다.
    sizes = [j.get("sampleSize", 0) for j in jobs]
    st = sum(sizes)
    h_ceiling = -sum((c / st) * math.log(c / st) for c in sizes if c > 0) if st else math.log(n_jobs)

    def job_entropy(counts):
        """계약이 말한 spread — 스킬이 등장하는 직무 분포의 엔트로피 (0~1).

        1.0 은 "모든 직무에 그 직무 규모에 비례해 등장" 이다 (ln(직무 수) 가 아니다 — 위 설명).
        """
        tot = sum(counts)
        if tot <= 0 or len(counts) < 2:
            return 0.0
        h = -sum((c / tot) * math.log(c / tot) for c in counts if c > 0)
        return round(min(1.0, h / h_ceiling), 4)

    # 공고 수는 직무별 표본(jobs.json 의 sampleSize)을 그대로 쓴다.
    # 키 이름을 posts 로 둔다 — skills[].n 은 스킬 이름이라 같은 payload 안에서
    # n 이 두 가지 뜻으로 쓰이면 헷갈린다. 실제로 그렇게 하다 이름을 숫자로 덮은 적이 있다.
    jrows = [{"id": j["id"], "title": j["title"], "family": j["family"],
              "posts": j.get("sampleSize", 0)} for j in jobs]
    jrows.sort(key=lambda r: -r["posts"])

    # 희소성 대리지표를 계약 스킬 단위로 다시 계산한다.
    # mine_vocab 은 통합 **전** 이름 단위로 재기 때문에, 합쳐진 스킬은 값이 비어 있다.
    # 계산식은 mine_vocab.py 와 같다 (우대/(요건+우대), 경험적 베이즈 축소, PRIOR=12).
    MIN_OBS, PRIOR = 3, 12
    agg = {}
    for sk in skills:
        rs = mined_rows(sk)
        agg[sk["id"]] = {
            "docs": sum(r.get("jd_doc_count", 0) for r in rs),
            "req": sum(r.get("req_count", 0) for r in rs),
            "pref": sum(r.get("pref_count", 0) for r in rs),
            "fam": max((f for r in rs for f in [r.get("dominant_family")] if f),
                       key=lambda f: sum(r.get("jd_doc_count", 0) for r in rs
                                         if r.get("dominant_family") == f), default=None),
            "ours": next((r.get("spread") for r in rs if r.get("spread") is not None), None),
        }
        # 문턱 없는 직무 분포를 합친다 (표기 통합된 스킬은 흡수된 이름들의 합)
        dist = {}
        for r in rs:
            for title, c in job_dist.get(r["key"], {}).items():
                jid = title_to_id.get(title)
                if jid:
                    dist[jid] = dist.get(jid, 0) + c
        agg[sk["id"]]["dist"] = dist
    tot_pref = sum(a["pref"] for a in agg.values())
    tot_obs = sum(a["req"] + a["pref"] for a in agg.values()) or 1
    base = tot_pref / tot_obs
    raw = {}
    for sid, a in agg.items():
        obs = a["req"] + a["pref"]
        raw[sid] = (a["pref"] + PRIOR * base) / (obs + PRIOR) if obs >= MIN_OBS else None
    scored = sorted((sid for sid, v in raw.items() if v is not None), key=lambda k: raw[k])
    prox = {sid: round((i + 1) / len(scored), 4) for i, sid in enumerate(scored)}
    print(f"희소성 대리지표 산출 {len(scored)}/{len(skills)}개 "
          f"(관측 {MIN_OBS}건 미만 제외) · 전체 우대 비율 {base:.3f}")

    srows = []
    for s in skills:
        a = agg[s["id"]]
        dist = a["dist"]
        df = len(dist)                       # 이 스킬이 등장한 직무 수 (문턱 없음)
        mapped = len(per_skill_jobs.get(s["id"], ()))   # 계약 매핑에 남은 직무 수 (5% 문턱)
        # ① 계약 방식 — 등장 직무가 적을수록 희소하다고 본다 (IDF)
        cy = round(math.log(n_jobs / df) / math.log(n_jobs), 4) if df else 1.0
        # ② 제안 방식 — 우대사항에 자주 오르는 스킬일수록 구하기 어렵다
        my = prox.get(s["id"])
        # 계약이 정의한 spread. 우리가 쓰던 spread(0.6×직군 엔트로피 + 0.4×직무명 다양도)는
        # 정의가 달라 계약을 검증하는 자리에 쓰면 안 된다. 참고로만 함께 싣는다.
        spread = job_entropy(list(dist.values()))
        ours = a["ours"]
        srows.append({
            "n": s["name"], "id": s["id"], "type": s["type"],
            "st": s.get("sourceType"), "cert": bool(s.get("isCertification")),
            "diff": s.get("learnDifficulty"), "al": s.get("aliases") or [],
            "x": spread, "cy": cy, "my": my, "ourSpread": ours,
            "jobs": df, "mapped": mapped, "docs": a["docs"], "fam": a["fam"],
            # 전이성을 실제로 뒷받침하는 표본 수. 엔트로피는 건수가 적으면 부풀려진다 —
            # Elastic 은 5개 직무에 1건씩 나와 x=0.506 이 됐다. 화면에서 걸러 볼 수 있게 싣는다.
            "posts": sum(dist.values()),
            "req": a["req"], "pref": a["pref"],
            "onMap": bool(s.get("onMap")),
        })

    check_payload(srows, jrows)

    both = [r for r in srows if r["my"] is not None]
    r_contract = pearson([r["x"] for r in both], [r["cy"] for r in both])
    r_alt = pearson([r["x"] for r in both], [r["my"] for r in both])

    def quad(x, y):
        return ("피벗 무기" if x >= .5 and y >= .5 else
                "범용 기반" if x >= .5 else
                "전문 무기" if y >= .5 else "기초 도구")
    qc, qm = {}, {}
    for r in both:
        qc[quad(r["x"], r["cy"])] = qc.get(quad(r["x"], r["cy"]), 0) + 1
        qm[quad(r["x"], r["my"])] = qm.get(quad(r["x"], r["my"]), 0) + 1

    # rq = 공고가 자격요건 절에 적었는가 / 우대사항 절에 적었는가.
    # 계약의 weight 문턱으로 가르면 직무 5개가 통째로 비어 버린다(DATA_COLLECTION 3-⑮).
    mrows = [{"j": m["jobId"], "s": m["skillId"], "w": m["weight"], "d": m.get("docFreq"),
              "rq": m.get("requirement"), "rf": m.get("reqFreq"), "pf": m.get("prefFreq"),
              **({"v": m["verification"], "g": m["guideMentions"]} if m.get("verification") else {})}
             for m in matrix]

    payload = {"jobs": jrows, "skills": srows, "matrix": mrows,
               "adj": sorted(adj, key=lambda e: -e["similarity"])[:80],
               "stats": {"nJobs": len(jrows), "nSkills": len(srows), "nMap": len(mrows),
                         "rContract": round(r_contract, 3), "rAlt": round(r_alt, 3),
                         "quadContract": qc, "quadAlt": qm}}

    html = PAGE.read_text(encoding="utf-8")
    html = re.sub(r'(<script id="payload" type="application/json">).*?(</script>)',
                  lambda m: m.group(1) + json.dumps(payload, ensure_ascii=False) + m.group(2),
                  html, count=1, flags=re.S)
    print(f"직무 {len(jrows)} · 스킬 {len(srows)} · 매핑 {len(mrows)}")
    print(f"  spread 정규화 — 도달 가능 상한 {h_ceiling:.4f} "
          f"(ln(직무수)={math.log(n_jobs):.4f} 로 나누면 축 오른쪽 "
          f"{(1 - h_ceiling / math.log(n_jobs)) * 100:.0f}% 가 빈다)")
    mx = max((r["x"] for r in srows), default=0)
    print(f"  spread 최대 {mx:.3f} · 1.0 으로 잘린 것 {sum(1 for r in srows if r['x'] >= 1.0)}개")
    print(f"  상관 r — 계약 방식 {r_contract:+.3f} · 제안 방식 {r_alt:+.3f}")
    print(f"  사분면 계약 {qc}")
    print(f"  사분면 제안 {qm}")
    PAGE.write_text(html, encoding="utf-8")
    print(f"→ {PAGE.relative_to(REPO)}")
    return payload


if __name__ == "__main__":
    run()
