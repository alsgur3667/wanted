<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 데이터 작업 규칙

`data/` 의 직무·스킬 데이터를 만들거나 고칠 때 지킬 것. 만드는 방법과 한계는
[`docs/DATA_COLLECTION.md`](docs/DATA_COLLECTION.md) 에 있다.

## ⚠️ 텍스트에서 어휘를 셀 때 부분문자열로 찾지 않는다

`if "unity" in text` 는 **opportunity · community 에도 걸린다.**
실제로 이 실수로 `Unity` 가 14건이 아니라 493건으로 집계됐다 — **97%가 오탐**이었다.

```python
# ✗ 하지 말 것
if key in blob:
    count[key] += 1

# ✓ 토큰으로 쪼개 대조하거나
tokens = set(re.findall(r"[A-Za-z][A-Za-z0-9+#./\-]*", blob.lower()))
if key in tokens: ...

# ✓ 단어 경계를 명시한다
if re.search(r"(?<![a-z0-9])" + re.escape(key) + r"(?![a-z0-9])", blob): ...
```

같은 원인으로 망가졌던 것들 — 짧은 약어일수록 위험하다.

| 스킬 | 오탐의 출처 |
|---|---|
| `BI` | am**bi**ent · **mo**bility |
| `RAG` | leve**rag**e · d**rag** |
| `Scala` | **scala**ble |
| `ERP` | ent**erp**rise |
| `Rust` | t**rust**ed |
| `Git` | di**git**al |
| `MOS` | at**mos**phere |

**한국어는 규칙이 다르다.** 조사가 붙어(`파이썬을`, `데이터가`) 단어 경계가 영어와 같지 않다.
한글 덩어리를 뽑은 뒤 조사를 떼고 대조한다 — `scripts/collect/mine_vocab.py` 의 방식을 따를 것.

## 검증 스크립트 통과 = 형식이 맞다는 뜻이지, 값이 맞다는 뜻이 아니다

`scripts/validate-data.mjs` 는 id 규칙·타입·범위·참조 무결성만 본다.
위 오탐이 있던 데이터도 **오류 0건 · 경고 0건으로 통과**했다.
`weight` 가 97% 부풀려져 있어도 0~1 범위 안이면 통과한다.

**새 집계 규칙을 넣거나 임계값을 바꿨으면 반드시 실측으로 대조한다.**

```
부분문자열로 센 값  vs  단어 경계로 센 값
바꾸기 전 값        vs  바꾼 뒤 값
```

숫자가 크게 움직였다면 왜 움직였는지 설명할 수 있어야 한다.

## 판단이 들어간 것은 데이터가 아니라 코드에 남긴다

`Photoshop` 을 `포토샵` 과 묶을지, `MySQL` 을 `SQL` 에 흡수시킬지는 **사람의 판단**이다.
결과 JSON 에만 반영하면 왜 그랬는지가 사라지고 다음 갱신 때 되돌아간다.
[`scripts/collect/synonyms.py`](scripts/collect/synonyms.py) 처럼 **이유를 적은 코드**로 남기고,
데이터는 거기서 생성한다.

## 추정치는 추정치라고 데이터에 적는다

`learnDifficulty` 는 유형별 기본값에서 나온 추정이고 `firstStep` 은 템플릿이다.
각각 `difficultySource` · `firstStepSource` 필드로 표시해 두었다.
**실측으로 바꾸기 전까지 이 표시를 지우지 않는다** — 화면에서 단정적으로 쓰면 안 되는 값이다.
