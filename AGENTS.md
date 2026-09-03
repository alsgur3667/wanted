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

**한국어는 규칙이 다르고, 여기서 한 번 더 틀렸다.**
조사가 붙기 때문에(`파이썬을`, `데이터가`) 오른쪽 경계를 열어 뒀더니 합성어가 들어왔다.

| 잘못 잡힌 것 | 실제 문장 |
|---|---|
| `Java` (별칭 "자바") | **자바**스크립트가 웹이라는 한계를 벗어나 |
| `hwp` (별칭 "한글") | 이재원님의 **한글** 자막을 참고해주세요 |
| `Linux` (별칭 "리눅스") | **리눅스**마스터 (자격증 이름) |

**오른쪽 한글은 조사·어미만 허용한다.** 경계 규칙은
[`scripts/collect/collect_common.py`](scripts/collect/collect_common.py) 의 `word_pattern()` **한 곳에만** 있다.
세 파일이 각자 같은 정규식을 갖고 있다가 어긋난 적이 있다. **복사해 쓰지 말고 그 함수를 import 한다.**

## 별칭은 넣기보다 빼기가 어렵다

경계 규칙으로는 **뜻이 다른 별칭**을 막을 수 없다. 실제로 걷어낸 것들이다.

| 뺀 별칭 | 코퍼스에서 실제로 뜻한 것 |
|---|---|
| `생성형 AI` → AI 코딩 도구 | "생성형 AI 기반 CS 운영 효율화" — 기술 범주이지 도구가 아니다 |
| `파이프라인 구축` → 시스템 구축 | 13건 전부 "CI/CD 파이프라인 구축"·"데이터 파이프라인 구축" |
| `서비스 운영` → 시스템 운영 | 18건이 "고객 서비스 운영 지원" — 고객 응대다 |
| `뷰` → Vue | "그래프 뷰"·"모바일 웹 뷰" |

**별칭을 추가할 때는 코퍼스에서 실제 용례 몇 줄을 읽고 넣는다.** 그럴듯해 보이는 것만으로는 부족하다.
반대로 `데이터 파이프라인`(→ETL)·`쿼리`(→SQL)·`사용자 경험`(→UX/UI) 은 용례를 읽어 보고 **남겼다.**

## 블로그·해설 글에서 뽑은 것은 공고와 같은 무게로 쓰지 않는다

블로그는 개인 의견이고 공고는 실제 수요다. `weight` 는 공고에서만 계산하고
해설 글은 `verification` 등급(`confirmed`·`corroborated`·`unverified`)으로 옆에 붙인다.
`unverified` 는 **해설 글 1건에서만 나온 것**이라 그대로 쓰면 안 된다.

해설 글에서 스킬을 셀 때는 **글 전체가 아니라 언급 지점 주변만** 본다. 글 전체로 세면
사이트 메뉴("Jira 유연한 프로젝트 관리 Confluence 모든 지식을…"), 다른 직무를 대조 설명하는 문단,
글 하단 추천 콘텐츠 위젯("콘텐츠 Best 3 ▶ [MongoDB란?]…")이 전부 요구 스킬로 잡힌다.
**벤더가 자기 블로그에서 자사 제품을 말한 것은 수요의 근거가 아니다** — 파는 사람의 말이다.

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

## 문턱을 걸어 만든 표로 분포를 재지 않는다

`required_skills` 는 등장률 5% 이상만 담는다. "이 직무가 요구하는가"를 정하는 데는 맞다.
그 표로 `spread`(직무 분포의 엔트로피)를 쟀더니 **여러 직무에서 3%씩 쓰이는 스킬이
어디에서도 안 잡혀** 「직무 1개짜리」가 되고 엔트로피가 0 이 됐다.

```
5% 문턱을 건 표   직무 1개에만 걸린 스킬 43% · spread 중앙값 0.158
문턱 없이 셈       직무 1개에만 걸린 스킬  6% · spread 중앙값 0.450
```

지도가 통째로 왼쪽에 눌어붙어 있어서 발견했다. **눈으로 봤을 때 이상하면 대체로 이상한 것이다.**

`weight` 같은 "이 직무가 요구하는가"는 문턱을 건 값을 쓰고,
`spread`·`scarcity` 같은 "이 스킬이 어디에 등장하는가"는 **문턱 없는 값**(`skill_job_dist`)을 쓴다.

**분포 지표는 표본 수와 함께 본다.** 엔트로피는 건수가 적으면 부풀려진다 —
`Elastic` 은 5개 직무에 1건씩 나와 `spread` 0.506 으로 `Python`(341건)과 같은 눈금에 올랐다.

## 판단이 들어간 것은 데이터가 아니라 코드에 남긴다

`Photoshop` 을 `포토샵` 과 묶을지, `MySQL` 을 `SQL` 에 흡수시킬지는 **사람의 판단**이다.
결과 JSON 에만 반영하면 왜 그랬는지가 사라지고 다음 갱신 때 되돌아간다.
[`scripts/collect/synonyms.py`](scripts/collect/synonyms.py) 처럼 **이유를 적은 코드**로 남기고,
데이터는 거기서 생성한다.

## 추정치는 추정치라고 데이터에 적는다

`learnDifficulty` 는 유형별 기본값에서 나온 추정이고 `firstStep` 은 템플릿이다.
각각 `difficultySource` · `firstStepSource` 필드로 표시해 두었다.
**실측으로 바꾸기 전까지 이 표시를 지우지 않는다** — 화면에서 단정적으로 쓰면 안 되는 값이다.
