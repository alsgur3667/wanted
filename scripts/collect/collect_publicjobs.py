"""공공데이터포털 — 재정경제부_공공기관 채용정보 조회서비스 (15125273).

이용허락범위 제한 없음. 국내 공고이고 **마감일(pbancEndYmd)** 을 준다.
지금까지 모은 해외 공고 1,200건은 마감일이 전부 비어 있어서, 기간 축은 이쪽이 채운다.

NCS 대분류가 우리 3직군에 그대로 대응한다.
  R600020 정보통신           → 개발
  R600008 문화·예술·디자인·방송 → 디자인
  R600001 사업관리           → 기획 (일반행정이 섞여 있어 제목으로 한 번 더 거른다)
"""
import json
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from collect_common import polite_get, load_env, save, load_seen, stats  # noqa: E402

API = "https://apis.data.go.kr/1051000/recruitment/list"
NCS = [("R600020", "개발"), ("R600008", "디자인"), ("R600001", "기획")]

# 기획은 사업관리 전체가 아니라 제품·서비스 기획에 가까운 것만 남긴다.
PLAN_HINT = ("기획", "PM", "PO", "프로덕트", "서비스기획", "사업기획", "전략", "상품기획",
             "데이터분석", "사업관리", "프로젝트관리")

CALL_BUDGET = 800          # 개발계정 일 1,000회. 여유를 남긴다.
ROWS = 100


def key():
    return urllib.parse.unquote(load_env()["DATA_GO_KR_KEY"])


def run():
    k = key()
    seen = load_seen()
    used = 0
    kept = {"개발": 0, "디자인": 0, "기획": 0}
    skipped = 0

    for code, fam in NCS:
        page = 1
        while used < CALL_BUDGET:
            r = polite_get(API, params={"serviceKey": k, "numOfRows": ROWS, "pageNo": page,
                                        "resultType": "json", "ncsCdLst": code}, timeout=40)
            used += 1
            if r.status_code != 200:
                print(f"  [{fam}] p{page} HTTP {r.status_code} 중단"); break
            try:
                d = r.json()
            except ValueError:
                print(f"  [{fam}] p{page} JSON 파싱 실패 중단"); break

            rows = d.get("result") or []
            if not rows:
                break

            for j in rows:
                title = j.get("recrutPbancTtl") or ""
                if fam == "기획" and not any(h in title for h in PLAN_HINT):
                    skipped += 1
                    continue
                sn = j.get("recrutPblntSn")
                url = j.get("srcUrl") or f"https://www.alio.go.kr/recruit?sn={sn}"
                j["_ncs_code"] = code
                rid = save(prefix="jd", source="data.go.kr:공공기관채용정보",
                           source_url=url, payload=j, subdir=f"jd/publicjobs/{code}",
                           posted_at=_ymd(j.get("pbancBgngYmd")),
                           expires_at=_ymd(j.get("pbancEndYmd")),
                           job_family=fam, license_="공공누리 제1유형(제한없음)",
                           http_status=200, seen=seen)
                if rid:
                    kept[fam] += 1

            total = d.get("totalCount", 0)
            if page * ROWS >= total:
                break
            page += 1
            if page % 20 == 0:
                print(f"  [{fam}] {page * ROWS:,}/{total:,} · 누적 {sum(kept.values()):,}건", flush=True)

        print(f"[완료] {fam}({code}) → {kept[fam]:,}건 (호출 {used})", flush=True)

    print(f"\n직군별: {kept} · 제목 불일치 제외 {skipped:,} · API 호출 {used}회")
    return kept


def _ymd(v):
    """20260915 -> 2026-09-15. 값이 없으면 None."""
    s = str(v or "").strip()
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if len(s) == 8 and s.isdigit() else None


if __name__ == "__main__":
    run()
    print(json.dumps(stats(), ensure_ascii=False, indent=2))
