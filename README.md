<div align="center">

# 커리어 내비 · Career Navi

**직무명이 아니라 역량으로 커리어를 연결합니다.**

이력서를 넣으면 가진 역량을 분석해 **갈 수 있는 커리어 경로 3개**를 제시합니다.<br/>
근거가 충분하면 스스로는 떠올리기 어려운 **"이 길도 있어요"** 경로도 함께 보여줍니다.

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
                  직무 × 역량 매트릭스 (공고 1,100건)
                              │
              ┌───────────────┴───────────────┐
         개인 이력서 입력                기업 채용 직무 선택
              ▼                               ▼
        갈 수 있는 경로 3개              적합도 순 지원자 목록
        적합도 · 부족 역량 · 첫 단계      전환 후보 · 신입 · 온보딩
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
fitScore = 100 × (필수 커버율 × 3 + 우대 커버율 × 1) / 4
weight   = 스킬이 등장한 공고 수 ÷ 그 직무의 전체 공고 수
```

코사인 유사도 대신 **커버율**을 씁니다. *"프론트엔드 공고 26건 중 17건에 React가 있었다"* 를 그대로 화면에 쓸 수 있기 때문입니다.
**LLM은 추출만 하고, 점수는 코드가 계산합니다** — 같은 입력에 같은 결과가 나와야 하므로.

---

## 데이터

| 직무 | 스킬 | 매핑 | 분석 공고 |
|:---:|:---:|:---:|:---:|
| **24** | **246**<br/><sub>공고 229 + 업무역량 17</sub> | **646**<br/><sub>`weight = docFreq / sampleSize`</sub> | **1,100** |

근거를 필드로 구분합니다 — `"source": "JD"` (공고 빈도) / `"source": "manual"` (수동 매핑)

```bash
node scripts/validate-data.mjs data/jobs.json data/skills.json data/job-skills.json
# 오류 0건이어야 앱에 투입
```

📄 [데이터 계약](./docs/DATA_SPEC.md) · [수집 방법](./docs/DATA_COLLECTION.md)

---

## 구조

```
app/
  page.tsx          랜딩 (개인 / 기업 분기)
  personal/         이력서 입력 → 결과
  employer/         지원자 매칭
  api/analyze/      역량 추출 → 적합도 산출
  api/og/           공유 카드 이미지
lib/
  skill-index.ts    직무×스킬 매트릭스 · 전이성 지수
  scoring.ts        개인 방향        matching.ts  기업 방향
  llm.ts            제공자 추상화 (gemini | anthropic | mock)
data/               수집 데이터 + 수동 보강분
scripts/            수집(Python) · 검증 · 병합
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
| [**ROADMAP**](./docs/ROADMAP.md) | 이력서 일괄 분석 · 원티드 데이터 연동 · 자기개선 루프 |
| [**DATA_SPEC**](./docs/DATA_SPEC.md) | 데이터 계약 — 3개 파일 스키마와 규칙 |
| [**DATA_COLLECTION**](./docs/DATA_COLLECTION.md) | 수집 파이프라인과 감안할 점 |
| [**PLAN**](./docs/PLAN.md) | 개발 일정과 마일스톤 |

---

## 로드맵

현재 기업 화면의 지원자는 **샘플 데이터**입니다.
이력서 파일 일괄 분석은 **비용 제어와 개인정보 처리 정책**이 선행되어야 해 이번 범위에서 제외했습니다.
매칭 엔진은 `Candidate[]` 만 받으면 동작하므로, 파일 파싱과 배치 처리만 추가하면 연결됩니다.

```
v2  이력서 파일 일괄 분석    파일 파싱 + 배치 처리
v3  원티드 데이터 연동       전이 경로 검증 · 정착률 예측
v4  자기개선 루프            추천 → 결과 → 재학습
v5  B2B 리스킬링 진단        조직 단위 역량 분포
```

→ [**전체 로드맵**](./docs/ROADMAP.md)

---

<div align="center"><sub>원티드 AI Championship 2026 출품작</sub></div>
