# 데이터 계약 (Data Contract)

수집팀 ↔ 앱 사이의 인터페이스. `types.ts` 가 코드의 계약이라면, 이 문서는 **데이터의 계약**이다.

파일 3개만 만들면 된다. 나머지(요구역량, 전이성 지수, 적합도)는 앱이 여기서 **계산해서** 만든다.

```
data/jobs.json        직무 마스터
data/skills.json      스킬 온톨로지
data/job-skills.json  직무 × 스킬 (매트릭스, long format)
```

> ✅ 넣기 전에 반드시 검증:
> ```bash
> node scripts/validate-data.mjs data/jobs.json data/skills.json data/job-skills.json
> ```
> 오류 0건이어야 앱에 넣을 수 있다.

---

## 1. `jobs.json` — 직무 마스터

```json
[
  {
    "id": "fe_dev",
    "title": "프론트엔드 개발자",
    "family": "개발",
    "aliases": ["프론트엔드", "FE 개발자", "Frontend Engineer", "웹 프론트엔드"],
    "sampleSize": 18,
    "source": "JD"
  }
]
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | string | **영소문자·숫자·밑줄만**. 중복 금지 |
| `title` | string | 화면에 그대로 노출되는 이름 |
| `family` | string | **`개발` \| `디자인` \| `기획`** 셋 중 하나 |
| `aliases` | string[] | 공고에서 발견한 표기 변형 전부. 없으면 `[]` |
| `sampleSize` | number | **이 직무를 몇 건의 공고에서 뽑았는지.** 화면에 "표본 18건"으로 노출 |
| `source` | string | `JD` \| `KNOW` \| `NCS` \| `manual` |

**직무를 몇 개 만들 것인가** — 미리 정하지 말고 **수집 결과에서 나오게** 한다.
같은 직무로 묶인 공고가 **10건 이상**인 것만 채택. 5건 미만이면 넣지 않는 편이 낫다.

---

## 2. `skills.json` — 스킬 온톨로지

```json
[
  {
    "id": "ab_test",
    "name": "A/B 테스트 설계",
    "type": "hard",
    "aliases": ["AB테스트", "A/B Test", "스플릿 테스트"],
    "learnDifficulty": 0.55,
    "firstStep": "가설 하나를 정하고 표본 크기까지 계산한 실험안을 써 보세요."
  }
]
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | string | 영소문자·숫자·밑줄. 중복 금지 |
| `name` | string | **정규화된 대표 표기 하나.** 화면에 그대로 노출 |
| `type` | string | `hard` \| `tool` \| `domain` \| `soft` |
| `aliases` | string[] | 같은 뜻의 다른 표기 전부 → 이력서 매칭에 쓰임 |
| `learnDifficulty` | number | **0~1.** 부족 역량 게이지와 온보딩 기간 추정에 사용 |
| `firstStep` | string | "오늘 당장 할 수 있는 행동" 한 문장. 추상어 금지 |

**주의 3가지**

1. **`name` 이 곧 화면 문구다.** `컴퓨터와 전자공학` 같은 추상어는 유저에게 안 와닿는다.
   `React`, `A/B 테스트 설계` 처럼 **일하는 사람이 쓰는 말**로.
2. **표기 통합이 제일 중요하다.** `프론트엔드`/`FE`/`Frontend` 를 따로 두면 전부 희소 스킬로 잡혀 점수가 망가진다.
3. **너무 포괄적인 건 빼라.** `커뮤니케이션 능력`, `업무 수행` 은 모든 직무에 있어서 변별력이 0이다.

**규모 목표** — 120~150개. 300개 넘으면 표기 정규화가 무너진다.

---

## 3. `job-skills.json` — 매트릭스 (long format)

```json
[
  { "jobId": "fe_dev", "skillId": "react",   "weight": 0.94, "docFreq": 17, "source": "JD" },
  { "jobId": "fe_dev", "skillId": "ab_test", "weight": 0.11, "docFreq": 2,  "source": "JD" }
]
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `jobId` | string | `jobs.json` 에 있는 id |
| `skillId` | string | `skills.json` 에 있는 id |
| `weight` | number | **0~1.** 그 직무에서 이 스킬의 중요도 |
| `docFreq` | number | 몇 건의 공고에 등장했는지 (선택, 근거용) |
| `source` | string | `JD` \| `KNOW` \| `NCS` |

**`weight` 를 어떻게 계산하나** — 가장 단순하고 방어 가능한 방식:

```
weight = 이 스킬이 등장한 공고 수 ÷ 그 직무의 전체 공고 수
       = docFreq ÷ jobs[].sampleSize
```

프론트엔드 공고 18건 중 17건에 React가 있으면 `17/18 = 0.94`.
심사에서 "이 숫자 뭐예요?" 물으면 **"공고 18건 중 17건"** 이라고 답할 수 있다. 이게 핵심이다.

- 등장하지 않은 조합은 **행을 아예 만들지 않는다** (0으로 채우지 말 것)
- 한 직무당 스킬 **5개 이상**은 있어야 적합도가 의미 있다. 10~20개 권장

---

## 앱이 이걸로 뭘 계산하나 (수집팀은 안 만들어도 됨)

| 앱이 만드는 것 | 계산 방식 |
|---|---|
| 필수/우대 역량 | `weight ≥ 0.6` → 필수, `0.3~0.6` → 우대 |
| `spread` (여러 직무에 통하는 정도) | 스킬이 등장하는 직무 분포의 엔트로피 |
| `scarcity` (희소성) | `log(전체 직무 수 / 이 스킬이 있는 직무 수)` |
| 적합도 | 필수 커버율×3 + 우대 커버율×1 |
| 온보딩 기간 | 부족 역량의 `learnDifficulty` 합 × 3개월 |

**그래서 수집팀이 신경 쓸 것은 딱 3개다.**
① 표기를 하나로 통합했는가 ② `weight` 를 공고 비율로 계산했는가 ③ `sampleSize` 를 정직하게 기록했는가

---

## 참고 파일

- `data/spec/jobs.sample.json`
- `data/spec/skills.sample.json`
- `data/spec/job-skills.sample.json`
- `scripts/validate-data.mjs`
