"""Tier 1 — Greenhouse Job Board API (키 불필요).

각 회사가 자사 채용 페이지에 노출할 목적으로 공개한 공식 엔드포인트다.
국내 기업 보드가 여기 있어서, 영문 글로벌 공고에 치우친 수집을 한국어 쪽으로 보완한다.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import polite_get, save, load_seen, stats  # noqa: E402
from classify import job_family  # noqa: E402

# (토큰, 표기) — 국내 본사 기업 우선
BOARDS = [
    ("coupang", "쿠팡"),
    ("krafton", "크래프톤"),
    ("daangn", "당근마켓"),
    ("moloco", "몰로코"),
    ("sendbird", "센드버드"),
    ("klaviyo", "Klaviyo"),
]

API = "https://boards-api.greenhouse.io/v1/boards/{}/jobs"


def run():
    seen = load_seen()
    kept = {"개발": 0, "디자인": 0, "기획": 0}
    skipped = 0

    for token, label in BOARDS:
        r = polite_get(API.format(token), params={"content": "true"}, timeout=90)
        if r.status_code != 200:
            print(f"[건너뜀] {label}({token}) HTTP {r.status_code}")
            continue
        jobs = r.json().get("jobs", [])
        n0 = sum(kept.values())

        for j in jobs:
            depts = " ".join(d.get("name", "") for d in (j.get("departments") or []))
            fam = job_family(j.get("title", ""), depts)
            if fam is None:
                skipped += 1
                continue
            j["_company"] = label          # 회사 실명 유지 (2026-09-01 결정)
            j["_board_token"] = token
            kept[fam] += 1
            save(prefix="jd", source=f"greenhouse:{token}",
                 source_url=j.get("absolute_url", ""), payload=j,
                 subdir=f"jd/greenhouse/{token}",
                 posted_at=(j.get("first_published") or "")[:10] or None,
                 expires_at=(j.get("application_deadline") or "")[:10] or None,
                 job_family=fam,
                 license_="public-api:greenhouse-job-board", seen=seen)

        print(f"[완료] {label:10} 전체 {len(jobs):>4}건 → 대상 {sum(kept.values()) - n0:>3}건")

    print("\n직군별 신규:", kept, "| 직군 불일치 제외:", skipped)
    return kept


if __name__ == "__main__":
    run()
    import json
    print(json.dumps(stats(), ensure_ascii=False, indent=2))
