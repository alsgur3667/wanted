"""Tier 1 — 공개 JSON 채용 API 4곳 수집 (키 불필요).

remotive · arbeitnow · jobicy · remoteok
전부 각 사이트가 배포 목적으로 공개한 엔드포인트다. HTML 스크래핑이 아니다.
"""
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import polite_get, save, load_seen, stats  # noqa: E402
from classify import job_family  # noqa: E402

seen = load_seen()
kept = {"개발": 0, "디자인": 0, "기획": 0}
skipped = 0


def keep(*, source, url, payload, subdir, title, extra, posted_at, license_):
    global skipped
    fam = job_family(title, extra)
    if fam is None:
        skipped += 1
        return
    rid = save(prefix="jd", source=source, source_url=url, payload=payload,
               subdir=subdir, posted_at=posted_at, expires_at=None,
               job_family=fam, license_=license_, seen=seen)
    if rid:
        kept[fam] += 1


# ------------------------------------------------------------------ Remotive
def remotive():
    r = polite_get("https://remotive.com/api/remote-jobs", timeout=60)
    for j in r.json().get("jobs", []):
        keep(source="remotive", url=j.get("url", ""), payload=j, subdir="jd/remotive",
             title=j.get("title", ""),
             extra=f"{j.get('category','')} {' '.join(j.get('tags') or [])}",
             posted_at=(j.get("publication_date") or "")[:10] or None,
             license_="public-api:remotive")


# ----------------------------------------------------------------- Arbeitnow
def arbeitnow(max_pages=12):
    url = "https://www.arbeitnow.com/api/job-board-api"
    for page in range(1, max_pages + 1):
        r = polite_get(url, params={"page": page}, timeout=60)
        data = r.json()
        rows = data.get("data") or []
        if not rows:
            break
        for j in rows:
            ts = j.get("created_at")
            posted = (datetime.fromtimestamp(ts, timezone.utc).date().isoformat()
                      if isinstance(ts, (int, float)) else None)
            keep(source="arbeitnow", url=j.get("url", ""), payload=j, subdir="jd/arbeitnow",
                 title=j.get("title", ""),
                 extra=" ".join((j.get("tags") or []) + (j.get("job_types") or [])),
                 posted_at=posted, license_="public-api:arbeitnow")


# -------------------------------------------------------------------- Jobicy
def jobicy():
    industries = ["engineering", "design-multimedia", "business", "data-science",
                  "product-management", "programming", "marketing"]
    for ind in industries:
        r = polite_get("https://jobicy.com/api/v2/remote-jobs",
                       params={"count": 50, "industry": ind}, timeout=40)
        try:
            rows = r.json().get("jobs", [])
        except ValueError:
            continue
        for j in rows:
            keep(source=f"jobicy:{ind}", url=j.get("url", ""), payload=j, subdir="jd/jobicy",
                 title=j.get("jobTitle", ""),
                 extra=" ".join((j.get("jobIndustry") or []) + (j.get("jobLevel") or [])
                                if isinstance(j.get("jobLevel"), list) else (j.get("jobIndustry") or [])),
                 posted_at=(j.get("pubDate") or "")[:10] or None,
                 license_="public-api:jobicy")


# ------------------------------------------------------------------ RemoteOK
def remoteok():
    r = polite_get("https://remoteok.com/api", timeout=60)
    rows = r.json()
    if rows and "legal" in rows[0]:
        (Path(__file__).parents[1] / "jd" / "remoteok").mkdir(parents=True, exist_ok=True)
        (Path(__file__).parents[1] / "jd" / "remoteok" / "_legal.txt").write_text(
            str(rows[0].get("legal", "")), encoding="utf-8")
        rows = rows[1:]
    for j in rows:
        keep(source="remoteok", url=j.get("url") or j.get("apply_url", ""), payload=j,
             subdir="jd/remoteok", title=j.get("position", ""),
             extra=" ".join(j.get("tags") or []),
             posted_at=(j.get("date") or "")[:10] or None,
             license_="public-api:remoteok (출처 표기 의무)")


if __name__ == "__main__":
    for fn in (remotive, arbeitnow, jobicy, remoteok):
        try:
            fn()
            print(f"[완료] {fn.__name__}  누적 {sum(kept.values())}건")
        except Exception as e:
            print(f"[실패] {fn.__name__}: {type(e).__name__} {e}")
    print("\n직군별 수집:", kept, "| 직군 불일치로 제외:", skipped)
    import json
    print(json.dumps(stats(), ensure_ascii=False, indent=2))
