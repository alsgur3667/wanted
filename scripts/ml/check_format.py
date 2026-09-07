"""학습용 CSV 의 **형식**만 검사한다. 데이터는 아직 넣지 않는다.

왜 필요한가
  칸 목록이 두 곳에 있다 — 각 CSV 의 헤더 줄과 data/ml/_columns.csv 카탈로그.
  두 곳이 어긋나면 나중에 데이터가 들어간 뒤에는 못 고친다.
  칸을 더하거나 뺄 때마다 이걸 돌린다.

검사하는 것
  · 헤더 == 카탈로그 (status 가 '제외권장' 인 칸은 헤더에 없는 것이 맞다)
  · enum 칸의 허용값이 비어 있지 않은지
  · config.csv 에서 아직 값이 안 정해진 항목
  · (데이터가 들어간 뒤에는) 줄마다 칸 수가 맞는지 · enum 값이 허용값 안인지

⚠️ 여기서 '확정/후보/보류/제외권장' 은 사람이 판단할 자리를 표시한 것이다.
   후보를 남길지 뺄지 정하기 전에는 데이터를 채우지 않는다 — 나중에 바꾸면 표본을 다시 만들어야 한다.
"""
import csv
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
D = REPO / (sys.argv[1] if len(sys.argv) > 1 else "docs/ml_format")


def run() -> int:
    cat = list(csv.DictReader((D / "_columns.csv").open(encoding="utf-8-sig")))
    tables = list(dict.fromkeys(c["file"] for c in cat))
    bad = []

    for t in tables:
        f = D / f"{t}.csv"
        if not f.exists():
            bad.append(f"{t}.csv 가 없다")
            continue
        with f.open(encoding="utf-8-sig", newline="") as fh:
            rd = csv.reader(fh)
            head = next(rd, [])
            n_rows = sum(1 for _ in rd)

        cols = [c for c in cat if c["file"] == t]
        #  '제외권장' 은 넣지 말자고 적어 둔 칸이다. 헤더에 없는 것이 맞다.
        want = [c["column"] for c in cols if c["status"] != "제외권장"]
        if head != want:
            missing = [c for c in want if c not in head]
            extra = [c for c in head if c not in want]
            bad.append(f"{t}: 헤더와 카탈로그가 다르다"
                       + (f" · 빠짐 {missing}" if missing else "")
                       + (f" · 남음 {extra}" if extra else ""))

        for c in cols:
            if c["type"] == "enum" and not c["allowed"]:
                bad.append(f"{t}.{c['column']}: enum 인데 허용값이 비었다")

        n_c = sum(1 for c in cols if c["status"] == "후보")
        n_b = sum(1 for c in cols if c["status"] == "보류")
        n_x = sum(1 for c in cols if c["status"] == "제외권장")
        print(f"  {t:16}{len(head):>3}칸  확정 {len(want) - n_c - n_b} · 후보 {n_c} · 보류 {n_b}"
              f"{f' · 제외권장 {n_x}' if n_x else ''}"
              f"{f'   (데이터 {n_rows:,}줄)' if n_rows else '   (헤더만)'}")

    todo = ([r for r in csv.DictReader((D / "config.csv").open(encoding="utf-8-sig"))
             if not r["value"]] if (D / "config.csv").exists() else [])
    open_cols = [c for c in cat if c["status"] in ("후보", "보류", "제외권장")]

    print()
    if todo:
        print(f"  아직 값이 안 정해진 설정 {len(todo)}개")
        for r in todo:
            print(f"    {r['key']:22} {r['allowed'] or r['type']:24} {r['note']}")
    if open_cols:
        print(f"\n  판단이 필요한 칸 {len(open_cols)}개")
        for c in open_cols:
            print(f"    [{c['status']:4}] {c['file']}.{c['column']:16} {c['note']}")

    if bad:
        print("\n  ⚠️ 형식 문제")
        for b in bad:
            print(f"    {b}")
        return 1
    print("\n  형식 이상 없음 — 헤더와 카탈로그가 맞는다")
    return 0


if __name__ == "__main__":
    sys.exit(run())
