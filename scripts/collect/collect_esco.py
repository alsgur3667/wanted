"""ESCO — 개발·디자인·기획 3직군만. ISCO 분류 가지를 직접 지정한다.

앞서 키워드 검색으로 받았더니 애견미용사·가사도우미까지 섞여 들어왔다.
검색어는 설명문에 걸리는 것이지 직업분류가 아니다. 분류 체계로 잡아야 범위가 지켜진다.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import collect_common as cc  # noqa: E402
from collect_common import polite_get, RAW, now_kst, sha256  # noqa: E402

cc.MIN_INTERVAL = 0.5
BASE = "https://ec.europa.eu/esco/api"
OUT = RAW / "ontology" / "esco"
OUT.mkdir(parents=True, exist_ok=True)

# ISCO-08 4자리 그룹. 이 가지 아래 직업만 받는다.
GROUPS = {
    "개발": ["C1330",                                    # ICT 서비스 관리자
             "C2120",                                    # 수학·계리·통계 (데이터 직무 인접)
             "C2511", "C2512", "C2513", "C2514", "C2519",  # SW 개발·분석
             "C2521", "C2522", "C2523", "C2529",           # DB·네트워크·보안
             "C3511", "C3512", "C3513", "C3514"],          # ICT 기술지원
    "디자인": ["C2163",                                   # 제품·의류 디자이너
               "C2166",                                   # 그래픽·멀티미디어 디자이너
               "C3432"],                                  # 인테리어 디자이너
    "기획": ["C1213",                                     # 정책·기획 관리자
             "C1221",                                     # 영업·마케팅 관리자
             "C2421",                                     # 경영·조직 분석가
             "C2431"],                                    # 광고·마케팅 전문가
}


def run():
    records, skills = [], set()
    for fam, codes in GROUPS.items():
        for code in codes:
            uri = f"http://data.europa.eu/esco/isco/{code}"
            r = polite_get(f"{BASE}/resource/concept",
                           params={"uri": uri, "language": "en"}, timeout=30)
            if r.status_code != 200:
                print(f"  [{fam}] {code} HTTP {r.status_code} 건너뜀"); continue
            g = r.json()
            occs = g.get("_links", {}).get("narrowerOccupation", [])
            gname = g.get("title")
            for o in occs:
                d = polite_get(f"{BASE}/resource/occupation",
                               params={"uri": o["uri"], "language": "en"}, timeout=30)
                if d.status_code != 200:
                    continue
                dd = d.json(); links = dd.get("_links", {})
                ess = [s.get("title") for s in links.get("hasEssentialSkill", []) if s.get("title")]
                opt = [s.get("title") for s in links.get("hasOptionalSkill", []) if s.get("title")]
                skills.update(ess); skills.update(opt)
                records.append({
                    "uri": o["uri"], "title": dd.get("title"), "job_family": fam,
                    "isco_code": code, "isco_group": gname,
                    "description": ((dd.get("description") or {}).get("en") or {}).get("literal"),
                    "alternative_labels": (dd.get("alternativeLabel") or {}).get("en", []),
                    "essential_skills": ess, "optional_skills": opt,
                })
            print(f"  [{fam}] {code} {gname or '':38} 직업 {len(occs):>3}개 "
                  f"· 누적 {len(records):,}", flush=True)

    (OUT / "occupations.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
    fam_c = {}
    for r_ in records:
        fam_c[r_["job_family"]] = fam_c.get(r_["job_family"], 0) + 1
    print(f"\n완료 — 직업 {len(records):,}개 · 고유 역량 {len(skills):,}개 · {fam_c}")

    rec = {"id": "onto_00002", "source": "esco:isco-scoped",
           "source_url": f"{BASE}/resource/occupation", "collected_at": now_kst(),
           "posted_at": None, "expires_at": None, "job_family": None,
           "license": "ESCO (EUPL) — 출처표시", "http_status": 200,
           "sha256": sha256(str(len(records))),
           "raw_path": "ontology/esco/occupations.json"}
    with (RAW / "_manifest.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    run()
