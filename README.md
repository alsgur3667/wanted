<div align="center">

# 커리어 내비 · Career Navi

**직무명이 아니라 역량으로 커리어를 연결합니다.**

이력서를 넣으면 가진 역량을 분석해 **갈 수 있는 커리어 경로 3개**를 제시합니다.<br/>
근거가 충분하면 스스로는 떠올리기 어려운 **"이 길도 있어요"** 경로도 함께 보여줍니다.

채용공고 1,435건에서 만든 직무–역량 매트릭스로<br/>
갈 수 있는 커리어 경로를 찾고, 직무명으로는 보이지 않던 지원자를 드러냅니다.

[**🔗 데모**](https://wantedai-teal.vercel.app) · [문서](#-문서) · [로드맵](./docs/ROADMAP.md)

`Next.js 16` `TypeScript` `Tailwind v4` `Gemini API` `Vercel`

</div>

---

## 문제

> 같은 일을 해 왔는데 **직함이 달라서 서로를 못 찾는다.**

구직자는 자기 역량이 어떤 직무로 이어지는지 모르고, 기업은 직무명으로 검색해 맞는 사람을 놓칩니다.
실제로 직종을 바꾸는 사람은 **연 5.9%** 뿐입니다. <sup>KLIPS 18~27차 · 연속 차수 관측 89,337건 기준</sup>

---

## 동작

```
                  직무 × 역량 매트릭스 (공고 1,435건)
                              │
              ┌───────────────┴───────────────┐
         개인 이력서 입력                기업 공고 작성·선택
              ▼                               ▼
        갈 수 있는 경로 3개              지원자 관리 / 추천 인재풀
        적합도 · 부족 역량 · 첫 단계      직접 작성 · AI 초안 · 역량 근거
```

같은 매칭 엔진을 **방향만 바꿔** 호출합니다.

| | 입력 | 출력 |
|---|---|---|
| **개인** | 내 역량 | 갈 수 있는 직무 |
| **기업** | 요구 역량 | 맞는 사람 |

---

## 무엇이 다른가

<table>
<tr><td width="50%" valign="top">

**① 몰랐던 경로를 찾습니다**

적합도만 높은 직무는 이미 아는 답입니다.
**직군이 다른데 역량이 맞는** 경로를 따로 표시합니다.

```
QA 엔지니어 3년차
  60  QA 엔지니어
  45  프로젝트·프로그램 매니저  ←
      요구사항 정의 · 정책 설계 ·
      이해관계자 조율을 이미 하고 있음
```

</td><td width="50%" valign="top">

**② 기업 화면은 같은 로직의 역방향**

```
프로덕트 매니저 채용
  직무명 검색  4명
       ↓
  역량 검색   6명

  놓친 2명
  IT QA 엔지니어 56
  그로스 마케터  54
```

</td></tr>
</table>

**③ 점수를 설명할 수 있습니다**

```
baseFit  = 100 × (필수 커버율 × 3 + 우대 커버율 × 1 + 강점 반영 × 2) / 6
fitScore = round(baseFit × 경력 적합도 + 현재 직무 일치 보너스)
weight   = 스킬이 등장한 공고 수 ÷ 그 직무의 전체 공고 수
```

코사인 유사도 대신 **커버율**을 씁니다. *"프론트엔드 공고 26건 중 17건에 React가 있었다"* 를 그대로 화면에 쓸 수 있기 때문입니다.
현재 직무가 정확히 일치하면 최대 8점을 더하고, 추천 순위는 `fitScore`를 우선하되 동점일 때만 표본 신뢰도와 직무 보정을 사용합니다.
**LLM은 추출만 하고, 점수는 코드가 계산합니다** — 같은 입력에 같은 결과가 나와야 하므로.

---

## 데이터

| 직무 | 스킬 | 매핑 | 분석 공고 |
|:---:|:---:|:---:|:---:|
| **24** | **298** | **1,509**<br/><sub>`weight = docFreq / sampleSize`</sub> | **1,435** |

근거를 필드로 구분합니다 — `"source": "JD"` (공고 빈도) / `"source": "manual"` (수동 매핑)

지원자용 회사 조회와 기업용 채용 화면에는 **가상 회사 18개·가상 공고 48개·가상 지원자 72명·지원 이력 288건**을 사용합니다. 기업은 공고를 직접 작성하거나 AI로 문구 초안을 만든 뒤 같은 72명의 가상 인재풀에서 추천 후보를 확인할 수 있습니다. 실제 회사나 인물의 문구·로고·이력서를 복제한 데이터가 아니며, 추후 실제 공급원을 같은 계약으로 교체하기 위한 목업입니다. 추천 모델 평가에는 사용하지 않습니다.

```bash
node scripts/validate-data.mjs data/jobs.json data/skills.json data/job-skills.json
# 오류 0건이어야 앱에 투입
npm run validate:demo-data
# 가상 회사·공고의 참조와 표시 규칙 검증
```

📄 [서비스 기획서](./docs/SERVICE_PLAN.md) · [현재 기능 명세](./docs/FUNCTIONAL_SPEC.md) · [데이터 계약](./docs/DATA_SPEC.md) · [회사·공고 계약](./docs/COMPANY_DATA.md) · [수집 방법](./docs/DATA_COLLECTION.md)

---

## 구조

```
app/
  page.tsx          랜딩 (개인 / 기업 분기)
  personal/         이력서 입력 → 결과
  companies/        가상 회사 목록 → 회사 상세
  jobs/             가상 채용공고 상세 → 지원 흐름
  employer/         공고 직접·AI 작성 → 추천 인재 / 기존 지원자 관리
  api/employer/     공고 문구 초안 생성 (gemini | anthropic | mock)
  api/analyze/      역량 추출 → 적합도 산출
  api/og/           공유 카드 이미지
lib/
  skill-index.ts    직무×스킬 매트릭스 · 전이성 지수
  company-index.ts  회사·공고 조회와 직무·스킬 연결
  employer-index.ts 공고·지원자·인재풀 연결과 ID 기반 적합도
  posting-draft.ts  게시 전 공고 계약·검증·금지 표현 경고
  scoring.ts        개인 방향        employer-index.ts  기업 방향
  llm.ts            제공자 추상화 (gemini | anthropic | mock)
data/               수집 데이터 + 수동 보강분 + 가상 회사·공고·지원자
scripts/            수집(Python) · 생성 · 검증 · 병합
types.ts            개인/기업 공통 계약
```

---

## 시작하기

```bash
git clone https://github.com/alsgur3667/wanted.git && cd wanted
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell에서는 `Copy-Item .env.example .env.local`을 사용합니다. 예시 설정은
`mock` 모드라 키 없이 E2E 흐름을 확인할 수 있지만, 실제 추천 품질 검증에는 Gemini 또는
Anthropic 키를 설정해야 합니다.

### 환경 변수

| 환경변수 | |
|---|---|
| `LLM_PROVIDER` | `mock` · `gemini` · `anthropic` 중 선택 |
| `GEMINI_API_KEY` | Gemini 이력서 추출 |
| `GEMINI_MODEL` | Gemini 모델명 (선택) |
| `ANTHROPIC_API_KEY` | Anthropic 이력서 추출 |
| `ANTHROPIC_MODEL` | Anthropic 모델명 (선택) |
| `DAILY_CALL_LIMIT` | 프로세스별 일일 LLM 호출 상한 (데모 비용 방어) |
| `POSTING_DRAFT_DAILY_LIMIT` | 프로세스별 일일 공고 AI 초안 호출 상한 (기본 80) |

> `.env.local` 은 **절대 커밋하지 않습니다.** 유료 API 자부담이라 키 유출 = 요금 폭탄입니다.

운영 환경에서 provider 호출이 실패하면 mock 추천으로 바꾸지 않고 오류를 반환합니다. 또한 현재 호출
상한은 프로세스 메모리 기준이므로, 여러 인스턴스로 배포할 때는 플랫폼 rate limit이나 공유 저장소가
추가로 필요합니다.

입력 이력서와 분석 결과는 애플리케이션 서버·DB에 저장하지 않습니다. 다만 실제 LLM provider를
사용하면 입력 내용이 해당 AI 제공자에 분석 목적으로 전송됩니다.

### 검증

```bash
npm run verify
```

위 명령은 lint, 단위·API 관통 테스트, 원본·중간 데이터 계약 검사, production build를 순서대로
실행합니다.

데이터 수집·평가용 Python 환경은 [uv](https://docs.astral.sh/uv/) lock 파일로 고정합니다.

```bash
uv sync
uv run python scripts/collect/eval_routes.py
```

---

## 📚 문서

| | |
|---|---|
| [**SERVICE_PLAN**](./docs/SERVICE_PLAN.md) | 타깃·문제·핵심 가치·기능 구조와 브랜드 메시지 기준 |
| [**FUNCTIONAL_SPEC**](./docs/FUNCTIONAL_SPEC.md) | 현재 구현된 화면·API·점수·저장 범위와 알려진 제약 |
| [**FUNCTIONAL_SPEC_BRIEF**](./docs/FUNCTIONAL_SPEC_BRIEF.md) | 강사 설명용 기능 명세 요약과 시연 순서 |
| [**FUNCTIONAL_SPEC_PDF**](./output/pdf/CAREER_NAVI_FUNCTIONAL_SPEC.pdf) | 강사에게 보여주기 위한 7쪽 기능 명세 요약 PDF |
| [**ROADMAP**](./docs/ROADMAP.md) | 이력서 일괄 분석 · 원티드 데이터 연동 · 자기개선 루프 |
| [**DATA_SPEC**](./docs/DATA_SPEC.md) | 데이터 계약 — 3개 파일 스키마와 규칙 |
| [**COMPANY_DATA**](./docs/COMPANY_DATA.md) | 가상 회사·공고 계약, 생성 원칙과 실제 데이터 교체 절차 |
| [**DATA_COLLECTION**](./docs/DATA_COLLECTION.md) | 수집 파이프라인과 감안할 점 |
| [**PLAN**](./docs/PLAN.md) | 2026-08-26에 작성한 초기 공모전 실행계획과 마일스톤 |
| [**RESUME_EVAL**](./docs/RESUME_EVAL.md) | 이력서를 넣어 추천이 말이 되는지 보는 테스트 — 실행법·채점 기준·기준선 |
| [**OPEN_PROBLEMS**](./docs/OPEN_PROBLEMS.md) | 찾았지만 아직 못 고친 것 (이슈가 없는 것들이 여기 원본) |

---

## 로드맵

현재 기업 화면의 회사·공고·지원자·지원 이력은 **가상 데이터**입니다. 새 공고 초안과 전형 상태 변경도 현재 화면에서만 유지됩니다. 새 공고의 결과는 지원 이력이 없는 `추천 인재`로 구분합니다.
이력서 파일 일괄 분석은 **비용 제어와 개인정보 처리 정책**이 선행되어야 해 이번 범위에서 제외했습니다.
기업 매칭은 `JobPosting`·`EmployerCandidate`·`CandidateApplication` 계약을 받으므로, 파일 파싱 결과를
같은 형태로 정규화하면 조회 UI를 유지한 채 실제 입력으로 교체할 수 있습니다.

```
v2  이력서 파일 일괄 분석    파일 파싱 + 배치 처리
v3  원티드 데이터 연동       전이 경로 검증 · 정착률 예측
v4  자기개선 루프            추천 → 결과 → 재학습
v5  B2B 리스킬링 진단        조직 단위 역량 분포
```

→ [**전체 로드맵**](./docs/ROADMAP.md)

---

<div align="center"><sub>원티드 AI Championship 2026 출품작</sub></div>
