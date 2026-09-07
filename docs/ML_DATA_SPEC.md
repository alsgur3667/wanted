# 학습용 데이터 구조 (초안 — 구조만, 실제 데이터는 아직 넣지 않는다)

모델을 만들기 전에 **어떤 칸을 담을지** 먼저 못 박는다.
칸을 나중에 바꾸면 이미 만든 표본·분할·점수가 전부 못 쓰게 된다.

## 지키는 것 네 가지

1. **원문은 저장소에 안 들어간다.** `data/ml/` 은 `data/raw/` 와 같이 git-ignore 한다.
   공고 본문·문장은 타사 저작물이다. 여기 만드는 파일은 **로컬 학습용**이고, 커밋하는 것은
   이 명세와 스크립트뿐이다.
2. **분할(train/valid/test)을 파일에 못 박는다.** 돌릴 때마다 다시 나누면 점수를 견줄 수 없다.
3. **정제 판단은 코드가 아니라 설정 파일에 남긴다.** 중복 기준·회사 상한·언어 방침은
   `data/ml/config.json` 에 값으로 둔다 (`data/overrides.json` 과 같은 철학).
4. **자질은 우리 사전 안에서만 만든다.** 이력서에서도 그 사전으로 역량을 뽑기 때문에,
   사전 밖의 말을 배우면 실전에서 못 쓴다.

---

## 0. `data/ml/config.json` — 정제 방침을 값으로

모든 산출물이 이 값을 보고 만들어진다. 무엇을 어떻게 걸렀는지 나중에 되짚을 수 있어야 한다.

| 칸 | 형 | 뜻 | 지금 상태 |
|---|---|---|---|
| `dedup.method` | `"prefix-hash"` \| `"minhash"` | 중복 판정 방법 | ⚠️ **결정 필요** |
| `dedup.prefixChars` | int | 앞 몇 자를 비교할지 (측정 때 600자 사용) | 600 |
| `dedup.keep` | `"newest"` \| `"first"` | 중복 묶음에서 무엇을 대표로 남길지 | ⚠️ 결정 필요 |
| `companyCap.mode` | `"none"` \| `"drop"` \| `"weight"` | 한 회사가 많이 올렸을 때 | ⚠️ **결정 필요** |
| `companyCap.max` | int | 회사당 최대 공고 수 (쿠팡 296건이 코퍼스의 12%) | ⚠️ 결정 필요 |
| `language.keep` | list | 담을 언어 (`ko`·`en`·`de`) | ⚠️ **결정 필요** (독일어 415건) |
| `minPosted` | date | 이보다 오래된 공고 제외 | `2025-09-01` (기존 값) |
| `split.by` | `"company"` | 무엇을 묶어 나눌지 | `company` |
| `split.ratio` | [float,float,float] | 학습/검증/시험 | [0.7, 0.15, 0.15] |
| `split.seed` | int | 고정 씨앗 | 20260904 |

---

## 1. `data/ml/postings.jsonl` — 정제된 공고 한 줄씩 (모든 데이터셋의 뿌리)

아래 데이터셋들은 전부 이 표의 `id` 를 참조한다. 정제 결과를 여기 한 번만 적는다.

| 칸 | 형 | 뜻 | 어디서 오나 |
|---|---|---|---|
| `id` | str | `jd_...` | 기존 `_manifest.jsonl` |
| `source` | str | `greenhouse:coupang` 등 | 기존 |
| `company` | str \| null | 회사 slug. null = 통합 게시판이라 모름 (42%) | source·URL 파싱 |
| `companySource` | `"board"` \| `"url"` \| `"unknown"` | 회사를 어떻게 알았나 | 파생 |
| `postedAt` | date \| null | 등록일 | 기존 |
| `lang` | `"ko"` \| `"en"` \| `"de"` \| `"other"` | 본문 언어 | 신규 판정 |
| `dupGroup` | str | 중복 묶음 키 | 신규 |
| `isPrimary` | bool | 그 묶음의 대표인가 (**통계는 대표만 센다**) | 신규 |
| `weight` | float | 회사 상한 적용 뒤 이 공고가 통계에 기여하는 몫 | 신규 |
| `jobFamily` | `"개발"` \| `"기획"` \| `"디자인"` | 직군 | 기존 |
| `jobId` | str \| null | 우리 24직무 중 배정된 것 | `build_roles` |
| `jobIdSource` | `"title-rule"` \| `"manual"` \| null | 어떻게 배정했나 | 신규 |
| `title` | str | 공고 제목 | 기존 |
| `hasSectionSplit` | bool | 자격요건/우대가 갈렸나 (1,589건 = 65%) | 파생 |
| `charLen` | int | 본문 길이 | 파생 |
| `split` | `"train"` \| `"valid"` \| `"test"` | **회사 단위**로 미리 못 박은 분할 | 신규 |
| `textRef` | str | 본문이 있는 `data/raw` 경로 | 기존 |

> ⚠️ 본문(`text`)은 이 파일에 넣지 않는다. 경로만 둔다.
> ⚠️ `weight` 를 둔 이유 — 회사 상한을 '버리기'로 하면 표본을 잃는다. '몫 줄이기'면 남긴 채로 눌린다.
>    둘 중 무엇으로 할지가 `config.companyCap.mode` 다.

---

## 2. `data/ml/sentences.jsonl` — 문장 한 줄씩 (모델 A-1·A-2가 **같이** 쓴다)

A-1(필수/우대 분류)과 A-2(역량 태깅)를 **한 표에** 둔다.
따로 두면 같은 문장이 두 파일에서 어긋난다.

| 칸 | 형 | 뜻 |
|---|---|---|
| `postingId` | str | 뿌리 공고 |
| `sentIdx` | int | 그 공고 안에서 몇 번째 문장인가 |
| `text` | str | 문장 원문 ⚠️ **커밋 금지** |
| `lang` | `"ko"` \| `"en"` \| `"de"` | 문장 언어 |
| `section` | `"req"` \| `"pref"` \| `"body"` | 어느 절에서 왔나 |
| `tierLabel` | `"required"` \| `"preferred"` \| null | **A-1 정답.** `section` 이 req/pref 일 때만 있다 |
| `tierSource` | `"section"` \| `"human"` | 라벨 출처. 사람이 고친 것을 구분한다 |
| `hasCue` | bool | "우대·있으면 좋다·필수" 같은 단서어가 있나 (**규칙 기준선**과 견주려고) |
| `skillIds` | list[str] | 이 문장에서 사전이 잡은 역량 |
| `spanTags` | list[str] | **A-2 약한 라벨.** BIO 표기 |
| `tokens` | list[str] | 토큰 (spanTags 와 길이가 같아야 한다) |
| `spanSource` | `"dictionary"` \| `"human"` | ⚠️ `dictionary` = **사람이 안 본 라벨**. 빠진 게 있다고 전제해야 한다 |
| `company` | str \| null | 분할 누수 막기용 (문장만 보고 나누면 같은 회사 상용구가 양쪽에 들어간다) |
| `dupGroup` | str | 같은 이유 |
| `split` | `"train"` \| `"valid"` \| `"test"` | `postings.split` 을 그대로 물려받는다 |

> 라벨이 붙는 문장은 `hasSectionSplit=true` 인 1,589건에서만 나온다.
> 나머지 792건은 **라벨 없는 적용 대상**이다 (`tierLabel=null`).

### 추가할지 고민할 칸
- `charLen`, `hasBullet` — 불릿 문장인지. 자격요건은 불릿이 많다
- `nearestHeading` — 바로 위 소제목 원문. 절 판정이 애매할 때 근거가 된다

---

## 3. `data/ml/profiles.jsonl` — 「역량 집합 → 직무」 한 줄씩 (모델 B)

**공고에서 만든 것과 설문에서 만든 것을 같은 모양으로** 담는다.
그래야 (나)안(공고로만 학습)과 (가)안(설문 학습)을 같은 코드로 견줄 수 있다.

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | str | `post:jd_...` 또는 `sv:2024#12345` |
| `source` | `"posting"` \| `"survey"` | 어디서 왔나 |
| `skillIds` | list[str] | **우리 사전 id만.** 자유 텍스트는 넣지 않는다 |
| `nSkills` | int | 개수 (3개 미만은 버린다) |
| `jobId` | str | 우리 24직무 라벨 |
| `jobIdSource` | `"posting-title"` \| `"survey-devtype"` | 라벨 출처 |
| `weight` | float | 중복·회사 상한 보정 |
| `group` | str \| null | 분할 그룹. 공고는 회사, 설문은 null |
| `split` | `"train"` \| `"valid"` \| `"sealed"` | ⚠️ `sealed` = **채점 전용. 학습에 절대 안 쓴다** |

> ⚠️ `sealed` 은 지금 `eval_routes.py` 가 쓰는 그 3,420건과 **같은 것**이어야 한다.
> 같은 씨앗·같은 절차로 뽑아 여기 못 박는다. 그래야 "규칙 31.8% 대 모델 N%" 가 성립한다.

### 설문에서 지금 **버리고 있는** 칸 — 넣을지 결정 필요

`collect_survey.py` 는 `year · jobId · devType · skills` 만 남기고 나머지를 버린다.
설문 원본에는 아래가 더 있다.

| 후보 칸 | 왜 쓸모 있나 | 위험 |
|---|---|---|
| `country` | ⚠️ **이슈 #14의 핵심.** 서구 편중을 숫자로 다룰 수 있다 — 아시아 응답자만으로 채점해 보거나 가중치를 줄 수 있다 | 없음 |
| `yearsCodePro` | 화면 입력에 연차가 있다. 같은 역량이라도 연차로 갈리는 직무가 있다 | 자기보고 |
| `orgSize` | 회사 규모에 따라 직무 정의가 다르다 (스타트업 풀스택 vs 대기업 분업) | 자질이 늘어 과적합 |
| `edLevel` | 학력 | ⚠️ **넣지 않는 쪽을 권한다** — 추천에 학력을 쓰면 차별 소지 |
| `remoteWork` | 근무 형태 | 직무 판별과 관계가 옅다 |

---

## 4. `data/ml/job_label_map.json` — 라벨 공간이 세 갈래로 어긋나 있다

우리 직무 24개 · 설문 개발 직무 12개 · 코퍼스 직군 3개.
셋을 잇는 표가 없으면 어느 모델도 학습이 안 된다.

```
{
  "jobs": [
    {
      "id":        "be_dev",
      "title":     "백엔드 개발자",
      "family":    "개발",
      "learnableFrom": ["posting", "survey"],   // 어느 자료로 배울 수 있나
      "surveyDevTypes": ["Developer, back-end"],
      "titlePatterns": ["backend", "백엔드", "server"],
      "nPostings": 119                          // 참고용 — 얇은 직무를 한눈에
    }
  ]
}
```

> ⚠️ 기획·디자인 직무는 `learnableFrom: ["posting"]` 이다.
> 설문으로는 안 갈린다 — 프로덕트 디자이너 171명의 상위 기술이 Figma 가 아니라
> JavaScript(64%)·HTML/CSS(65%) 였다.

---

## 5. 만들어질 파일과 커밋 여부

| 파일 | 커밋 |
|---|---|
| `docs/ML_DATA_SPEC.md` (이 문서) | ✅ |
| `scripts/ml/*.py` (구성·학습 스크립트) | ✅ |
| `data/ml/config.json` | ✅ (판단을 담은 설정) |
| `data/ml/job_label_map.json` | ✅ (라벨 정의) |
| `data/ml/postings.jsonl` | ❌ |
| `data/ml/sentences.jsonl` | ❌ 원문 조각 |
| `data/ml/profiles.jsonl` | ❌ 설문 파생 (ODbL) |
| 모델 파일 | ❌ |
