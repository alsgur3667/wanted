# Codex UI v5 작업 인수인계

2026-09-17 · 공유 브랜치: `feature/redesign-preview-v2-codex`

## 지금 전달하는 내용

랜딩을 제외한 제품 화면 22개의 시안과 v4 비교 이미지입니다. **v5를 실제 앱에 적용한 상태는 아닙니다.** 팀원이 시안을 확인하고 기존 기능에 디자인을 옮길 수 있도록 파일과 기준을 함께 남깁니다.

- 시작 파일: [output/design-mockup/codex-v5/review.html](../output/design-mockup/codex-v5/review.html)
- 실행·파일 구성: [시안 README](../output/design-mockup/codex-v5/README.md)
- 시안 연결 코드: [cohesion.js](../output/design-mockup/codex-v5/cohesion.js)
- v5 스타일: [cohesion.css](../output/design-mockup/codex-v5/cohesion.css)

이 브랜치는 기존 `feature/redesign-preview-v2`의 `be18e412ce0fc3e36174621814f0a0a7d55151b9`에서 이어집니다. 이미 들어 있던 `app/preview/*-v2`, `components/redesign/`, `public/redesign/`는 별도의 Next.js 미리보기 구현입니다. 해당 구현 설명은 [REDESIGN_PREVIEW.md](REDESIGN_PREVIEW.md)에 있습니다. **그 구현이 이번 v5와 같다고 보시면 안 됩니다.** 특히 사진이 있는 로그인과 `CareerMapV2`는 아래의 최신 요청과 다릅니다.

## 이번에 반영한 요청

1. 기업만 녹색으로 보이지 않도록 개인·기업의 넓은 배경과 패널을 같은 중립 색상으로 맞췄습니다.
2. 일반 화면 18개는 같은 상단 이미지, 높이, 크롭과 명암을 사용합니다. 화면마다 별도의 진한 색 배너로 바꾸지 않습니다.
3. 개인·기업 로그인은 좌측 사진을 빼고 **기존 `LoginJourney`와 `CareerMap`**을 사용합니다.
4. 분석 중·완료는 가운데 사진을 빼고 **기존 `RouteSearchLoader`**를 사용합니다.

랜딩은 작업 범위에서 제외합니다. 개인은 경험을 정리하고 경로를 탐색하는 사용자, 기업은 채용 조건과 지원자를 검토하는 사용자입니다. 색상을 맞추더라도 메뉴·문구·주 행동까지 같은 것으로 만들지는 않습니다.

## 공통 적용 기준

| 항목 | v5 시안 기준 |
|---|---|
| 바탕 / 패널 | `#f7f5f0` / `#fffefa` 중심 |
| 제목 / 본문 / 구분선 | `#27333b` / `#58646a` / `#e1ded6` |
| 주요 버튼 | 차콜 `#2c3a43`, 흰색 글자 |
| 넓은 강조 영역 | 아이보리·흰색. 기업 전용 녹색 면과 진한 결과 요약 면 제거 |
| SVG 경로 | 기존 청록과 앰버 유지. 한 장면에서 강조선은 5개 중 1개 |
| 상단 배너 | `assets/journey-clean.png`, PC 높이 200px, 모바일 215px |
| 배너 이미지 배치 | PC `center 48% / cover`, 동일한 아이보리 그라데이션. 모바일 규칙은 `cohesion.css` 참조 |
| 배너 적용 위치 | 공통 헤더 바로 아래. 기업에서는 사이드바와 작업 영역보다 위 |
| 배너 제외 | 개인 로그인, 기업 로그인, 분석 중, 분석 완료의 4개 SVG 화면 |
| 제목 글꼴 | 한글 산세리프. 시안에는 Noto Sans KR 400·700 파일 내장 |
| 배너 제목 | PC 32px, 모바일 26px. 줄바꿈과 넘침은 실제 데이터로 재확인 |
| 로고 | 실제 적용에서는 랜딩과 같은 로고 컴포넌트·글꼴·크기를 공유. 시안의 임시 마크를 새 로고로 채택하지 않음 |

색상과 배너 규칙을 한 공통 컴포넌트에서 관리하는 것을 권합니다. `cohesion.js`의 DOM 교체와 여러 파일의 누적 CSS는 빠르게 비교하기 위한 시안 구조입니다. 이를 그대로 앱의 런타임에 넣는 대신 기존 React 컴포넌트에 필요한 레이아웃과 스타일을 옮겨주세요.

글자 크기만 일괄 축소해서 한 화면에 맞추지 않습니다. 실제 데이터로 제목, 탭, 주요 수치와 버튼이 먼저 읽히는지 확인해야 합니다. 시안의 보조 글자에는 10~14px도 포함되어 있어 실제 서비스에 적용할 때 대비와 크기 검토가 필요합니다.

## 화면별 적용 위치

시안의 `#...`는 정적 HTML 상태 전환용이며, 새로운 서비스 URL을 만들라는 뜻이 아닙니다.

| 시안 ID | 실제 경로·상태 | 기존 적용 대상 |
|---|---|---|
| `personal` | `/personal` 입력 | `app/personal/page.tsx`, `components/ResumeInput.tsx`, `ResumeFileDrop.tsx` |
| `login-personal` | `/login?role=personal` | `app/login/page.tsx`, `LoginForm.tsx`, `LoginJourney.tsx` |
| `login-employer` | `/login?role=employer` | 위와 같은 컴포넌트의 기업 분기 |
| `loading` | 개인 분석 중 | `RouteSearchLoader.tsx`, `components/route-search-loader.css` |
| `complete` | 개인 분석 완료 | 위 컴포넌트의 완료 상태 |
| `results` | 개인 추천 결과 | `ResultView.tsx`, `RouteCard.tsx`, `components/result-view.css` |
| `route-detail` | 추천 경로 펼침 | `RouteAccordion.tsx`, `JobRequirements.tsx` |
| `skills` | 내 역량 탭 | `SkillGroups.tsx` |
| `skill-map` | 역량 분포 | `SkillMap.tsx` |
| `explore` | 다른 직무 탐색 | `JobExplorer.tsx`, `RankingTable.tsx` |
| `companies` | `/companies` | `app/companies/page.tsx`, `CompanyDirectory.tsx`, `CompanyMark.tsx` |
| `company-detail` | `/companies/[companyId]` 공고 | `app/companies/[companyId]/page.tsx` |
| `company-about` | 위 경로의 기업 소개 | 위 파일과 `ContentTabs.tsx` |
| `job` | `/jobs/[postingId]` | `app/jobs/[postingId]/page.tsx`, `JobRequirements.tsx` |
| `apply` | `/jobs/[postingId]/apply` | 해당 경로의 `page.tsx`, `DemoApplication.tsx` |
| `applied` | 지원 완료 상태 | `DemoApplication.tsx` |
| `employer` | `/employer` 지원자 관리 | `app/employer/page.tsx`, `EmployerWorkspace.tsx`, `EmployerCandidateCard.tsx` |
| `candidate` | 지원자 상세 | `EmployerCandidateDetail.tsx` |
| `compose-conditions` | 공고 작성 1단계 | `PostingComposer.tsx` |
| `compose-content` | 공고 작성 2단계 | `PostingComposer.tsx` |
| `compose-review` | 공고 작성 검토 | `PostingComposer.tsx` |
| `talent` | 추천 인재 | `TalentPoolResults.tsx`, `CandidateCard.tsx` |

컴포넌트명만 적힌 파일은 `components/` 아래입니다. `/preview/*-v2` 구현을 바탕으로 작업한다면 대응하는 `components/redesign/*V2`에 같은 기준을 적용하되, 로그인·분석 지도는 위의 기존 컴포넌트를 사용해주세요.

## SVG와 분석 전환에서 유지할 동작

관련 원본은 `components/LoginJourney.tsx`, `components/CareerMap.tsx`, `lib/login-map.ts`, `lib/career-map.ts`, `app/login/login.css`입니다. 시안은 이 파일들을 복제해 다시 그리지 않고 번들로 직접 연결했습니다.

- 개인: 하단의 `나의 경험`에서 5개 직무로 선이 뻗습니다. 선과 라벨이 사라진 뒤 새 위치와 직무로 반복합니다.
- 기업: 사방의 경험자에서 원근 격자 중앙의 `Career Navi`로 선이 모입니다. `Navi`의 색상도 유지합니다.
- 기존 8초 주기, 겹침을 피하는 위치 생성, 직무 변경, 무작위 강조선 1개를 유지합니다. 좌표나 텍스트를 고정된 새 배열로 대체하지 않습니다.
- 일시정지와 동작 줄이기를 유지합니다. `CareerMap`의 잘라낸 `viewBox` 밖으로 격자가 새지 않도록 SVG의 `overflow`를 확인합니다.
- 분석은 기존 1.5초 간격의 문구 3개를 최소 한 번 보여준 뒤 완료됩니다. 응답이 늦으면 결과를 기다립니다.
- 완료 뒤 자동 이동하지 않고 `분석 결과 보기`를 누릅니다. 제목·지도·상태·버튼 영역의 자리를 유지해 전환 때 흔들리지 않도록 합니다.
- 지도 직무는 탐색 과정을 설명하는 예시입니다. 실제 분석 결과라고 설명하지 않습니다.

정적 시안의 `loading`은 계속 분석 중이며 `complete`는 `ready=true`를 주고 약 4.5초 기다리는 방식입니다. 실제 API의 성공·오류 처리를 대체하는 코드가 아닙니다.

## 이미지와 파일 출처

아래 경로는 `output/design-mockup/codex-v5/` 기준입니다.

| 소재 | 파일·사용 위치 | 적용 시 유의점 |
|---|---|---|
| 공통 상단 길·문 이미지 | `assets/journey-clean.png` | 이전 시안에서 준비한 소재. 18개 화면에서 같은 파일 사용 |
| 이전 배경 | `assets/journey.png` | 이전 시안 구성에서 참조하는 소재. v5 상단 배너 기준은 `journey-clean.png` |
| 개인 화면 첨부 원본 | `assets/reference-personal.png` | 제공 서비스 안내와 하단 배너를 해당 영역으로 잘라 표시 |
| 기업 화면 첨부 원본 | `assets/reference-companies.png` | 이전 참고 자료. v5 하단은 개인 원본과 같은 산 배너 사용 |
| 서비스 안내 이미지 | `screens.js`의 `waves()`, 원본 영역 `475 934 365 145` | 새로 비슷하게 그린 파형으로 바꾸지 않음 |
| 하단 산 배너 | `cohesion.js`의 `banner()`, 원본 영역 `0 1097 1327 88` | 문구·버튼까지 합쳐진 이미지. 배경만 분리한 최종 소재가 아님 |
| 경험 입력 옆 입체 문서 | `index.html`의 `illustration()` | 시안용 SVG. 로그인·분석에 복사하지 않음 |
| 글꼴 | `assets/fonts/noto-kr-400.woff`, `noto-kr-700.woff` | 시안 오프라인 표시용. 실제 앱에서는 랜딩과 제품의 글꼴 정책을 함께 확인 |

하단 CTA를 실제 서비스로 만들 때는 배경 소재를 따로 준비하고 문구·버튼을 HTML로 구성해야 합니다. 원본 스크린샷 전체를 최종 배경으로 사용하면 모바일에서 글자가 작아지고 문구를 바꿀 수 없습니다. 기존 `public/redesign/`의 다른 이미지로 임의 교체하면 이번에 지적된 이미지 불일치가 다시 생길 수 있습니다.

## 작업 순서와 완료 확인

1. `review.html`에서 전체 흐름을 보고, 공통 색상·헤더·배너를 먼저 정리합니다. 랜딩의 외형은 유지합니다.
2. 로그인과 분석 화면은 기존 SVG 컴포넌트로 연결하고 크기·배치만 조정합니다.
3. 개인 입력 → 결과·상세 → 기업·공고·지원 → 기업 관리·공고 작성 순서로 옮깁니다.
4. 각 단계에서 실제 데이터와 기존 입력·탭·필터·상태 전환을 확인합니다. 시안의 가상 점수나 인원수를 앱에 고정하지 않습니다.

확인할 항목:

- PC 1440px·낮은 화면 높이와 모바일 390px에서 가로 넘침, 잘린 버튼, 겹친 라벨이 없는지
- 기업의 지원 인원과 진행 현황이 첫 화면에서 보이는지
- 결과의 추천 경로·내 역량·다른 직무 탐색이 누를 수 있는 탭으로 보이는지
- 추천 카드를 펼치기 전에도 활용 역량·보완 역량·추천 이유가 읽히는지
- 여러 직업의 데모 예시 선택, 파일 업로드, 분석 취소·실패·완료가 기존대로 작동하는지
- 로그인 SVG의 개인·기업 방향, 반복, 라벨 변경, 강조선 1개와 일시정지가 유지되는지
- 분석 완료 전환에서 위치가 바뀌지 않고 버튼을 눌러야 결과로 가는지
- 랜딩과 다른 페이지의 로고 글꼴·크기, 키보드 포커스와 글자 대비가 맞는지

시안 단계에서는 22개 PC·모바일 화면의 가로 넘침, 공통 배너 18개의 일치, SVG 반복·일시정지, 완료 전환 위치 유지, 비교 페이지와 로컬 파일 실행을 확인했습니다. **실제 앱 기능을 v5 디자인으로 검증한 것은 아닙니다.** 앱에 적용한 뒤 관련 테스트와 저장소의 `npm run verify`를 실행해야 합니다.

분석·점수 계산·데이터 집계는 이번 UI 작업 범위가 아닙니다. 화면에서 점수를 보여주는 방식이 바뀌어도 추천 로직이나 수치를 시안에 맞춰 바꾸지 않습니다.
