# 회사·채용공고 데이터 계약

## 목적

지원자가 회사와 채용공고를 조회하고 지원 흐름을 확인할 수 있도록 만든 목업 데이터입니다. 현재 데이터는 모두 가상이며, 실제 서비스에서는 공급원 데이터를 동일한 `Company`·`JobPosting` 계약으로 정규화해 UI를 그대로 사용할 수 있게 설계했습니다.

가상 데이터는 추천 점수 계산과 모델 평가에 사용하지 않습니다. 추천 결과의 `jobId`에 맞는 예시 공고를 보여 주는 조회 계층일 뿐입니다.

## 데이터 출처 원칙

- 공개 채용 서비스에서 일반적으로 제공하는 **필드 종류와 정보 배치**만 참고합니다.
- 실제 회사명, 소개 문구, 로고, 이미지, 공고 원문과 웹사이트 주소를 복제하지 않습니다.
- 리뷰와 평점은 사실처럼 오인될 가능성이 커 생성하지 않습니다.
- 모든 레코드에 `isSynthetic`, `synthesisBasis`, `generatedAt`을 넣어 가상 데이터임을 추적합니다.
- 참고한 페이지와 적용 범위는 `data/demo-company-meta.json`에 기록합니다.

## 파일

| 파일 | 내용 |
|---|---|
| `data/demo-companies.json` | 가상 회사 18개 |
| `data/demo-job-postings.json` | 가상 채용공고 48개 |
| `data/demo-company-meta.json` | 생성 시점·시드·참고 범위·분포 |
| `data/demo-employer-candidates.json` | 기업용 가상 지원자 72명 |
| `data/demo-candidate-applications.json` | 48개 공고의 가상 지원 이력 288건 |
| `data/demo-employer-meta.json` | 지원자 생성 시점·시드·분포 |
| `scripts/mock/build_company_data.py` | 결정론적 생성기 |
| `scripts/mock/validate_company_data.py` | 계약·참조·표시 규칙 검증기 |
| `scripts/mock/build_employer_data.py` | 기업용 가상 지원자·지원 이력 생성기 |
| `scripts/mock/validate_employer_data.py` | 기업용 참조·분포 검증기 |

스냅샷은 `2026-09-07`, 시드는 `20260907`로 고정했습니다. 현재 직무 24개에 공고를 정확히 2개씩 연결합니다. 회사 단계는 초기 4개, 성장 8개, 안정 5개, 대규모 1개이며 연봉 표시는 범위 공개 24개, 협의 12개, 내규 12개로 나눴습니다. 이 값들은 실측 통계가 아니라 다양한 UI 상태를 확인하기 위한 목업 분포입니다.

기업용 데이터는 `2026-09-08`, 시드 `20260908`로 고정했습니다. 직무별 지원자 3명씩 총 72명을 만들고, 공고마다 같은 직무 3명과 역량이 겹치는 다른 직무 3명을 연결해 지원 이력 288건을 구성합니다. 이 또한 채용 시장 분포가 아니라 직무 전환 후보와 필터 상태를 검증하기 위한 목업 값입니다.

## 핵심 계약

### `Company`

- 식별: `id`, `name`
- 소개: `tagline`, `description`, `industry`, `productDescription`, `products`, `tags`
- 규모·위치: `stage`, `employeeCountRange`, `foundedYear`, `headquarters`, `locations`, `workModes`
- 지원 판단 정보: `culture`, `benefits`, `hiringProcess`
- 브랜드·링크: `brand`, `websiteUrl`, `imageUrls`
- 출처 표시: `isSynthetic`, `synthesisBasis`, `generatedAt`

### `JobPosting`

- 참조: `id`, `companyId`, `jobId`
- 직무 조건: `title`, `jobFamily`, `level`, `minCareerMonths`, `maxCareerMonths`, `employmentType`
- 근무 조건: `workMode`, `location`, `salary`, `postedAt`, `deadlineType`, `deadline`, `status`
- 상세 내용: `summary`, `responsibilities`, `benefits`, `hiringProcess`, `applicationDocuments`
- 역량 참조: `mustSkillIds`, `niceSkillIds`
- 출처 표시: `isSynthetic`, `synthesisBasis`, `generatedAt`

### `PostingDraft`

- 직접 작성과 AI 생성이 함께 사용하는 게시 전 계약입니다.
- 게시 일시·마감일·공개 상태처럼 아직 사실이 아닌 값은 만들지 않고 `status: draft`로 구분합니다.
- AI는 제목·소개·주요 업무 문구만 작성합니다. 직무와 필수·우대 역량은 내부 `jobId`·`skillId`로 제한하고 적합도는 코드가 계산합니다.
- 생성 결과는 전부 수정할 수 있으며, 차별 소지가 있거나 검증하기 어려운 보장성 표현은 검토 경고를 표시합니다.
- 초안은 현재 화면 세션에만 있으며 게시·저장되지 않습니다.

### `EmployerCandidate`·`CandidateApplication`

- 지원자: 현재 직무·경력·산업·지역·희망 근무 방식·스킬 ID·스킬 근거·경험 요약
- 지원 이력: 공고·지원자 참조, 지원일, 유입 경로, 전형 상태
- 회사와 공고는 지원 이력을 거쳐 지원자와 연결합니다. 한 지원자를 공고마다 복제하지 않습니다.
- 전형 상태 변경은 UI 세션 안에서만 동작하며 서버나 DB에 저장하지 않습니다.

새 공고에는 아직 `CandidateApplication`이 없으므로 전체 가상 인재풀을 `TalentCandidateMatch`로 계산합니다. 화면에서도 이를 `추천 인재`로 표시하며 기존 공고의 `지원자`와 혼용하지 않습니다.

타입의 단일 기준은 `types.ts`입니다. `companyId`는 회사, `jobId`는 기존 직무, 스킬 ID는 기존 스킬 온톨로지를 참조합니다.

## 생성과 검증

```bash
npm run build:demo-data
npm run validate:demo-data
```

생성기는 정렬 순서와 시드를 고정하므로 같은 소스 데이터에서 같은 결과를 만듭니다. 검증기는 다음을 확인합니다.

- 회사·공고 ID 중복과 참조 무결성
- 24개 직무의 공고 존재 여부
- 존재하지 않는 스킬 참조
- 가상 데이터 표시와 생성 근거
- 실제 회사명·URL·이미지 혼입 방지
- 연봉 범위, 마감 유형, 메타데이터 분포 일치
- 가상 지원자 72명과 지원 이력 288건의 직무·스킬·공고 참조
- 모든 공고에 같은 직무 후보와 직무 전환 후보가 함께 존재하는지

## 실제 데이터로 교체할 때

1. 공급원별 원본 필드를 별도 보관하고 수집 일시와 이용 조건을 기록합니다.
2. 공급원 어댑터에서 원본을 `Company`와 `JobPosting`으로 변환합니다.
3. 회사·공고의 외부 식별자를 내부 ID와 매핑하고, 직무와 스킬은 기존 `jobId`·`skillId`에 정규화합니다.
4. 지원자와 지원 이력은 `EmployerCandidate`·`CandidateApplication`으로 변환하고 공개 동의 범위를 필드별로 기록합니다.
5. 같은 검증 규칙을 통과시킨 뒤 `lib/company-index.ts`와 `lib/employer-index.ts`의 JSON 입력을 API나 실제 스냅샷으로 교체합니다.
6. 실제 데이터에서는 `isSynthetic`을 리터럴 `true`가 아닌 출처 상태 타입으로 확장하고, UI 안내 문구를 공급원·갱신 시점 표기로 바꿉니다.

현재 계약은 목업의 안전한 구분을 위해 `isSynthetic: true`로 제한합니다. 실제 연동을 시작할 때 이 필드만 임의로 `false`로 바꾸지 말고, 실제 데이터용 provenance 계약과 검증을 먼저 추가해야 합니다.
