# 제품 화면 리디자인 — 미리보기 브랜치 안내

> 2026-09-17 추가: 이 문서는 기존 `/preview/*-v2` 구현 설명입니다. 별도로 공유한 **Codex v5 정적 시안과 최신 수정 요청**은 [CODEX_UI_V5_HANDOFF.md](CODEX_UI_V5_HANDOFF.md)를 확인하세요. 특히 로그인·분석의 기존 SVG 유지와 배너·배경 통일 기준은 두 결과물을 구분해서 읽어야 합니다.

작성일: 2026-09-17 · 상태: **검토용 1차 반영 (기존 화면 무변경)**

## 1. 한 줄 요약

`/personal`, `/companies`, `/login`, `/employer` 등 제품 화면 7종을 첨부 시안(웜 베이지 · 청록 포인트 · 세리프 숫자) 기준으로 다시 짰다.
**기존 파일은 하나도 수정·삭제하지 않았고**, 전부 `components/redesign/` 와 `app/preview/*-v2` 아래 신규 파일로 추가했다.
받아서 `npm run dev` 만 하면 기존 화면과 새 화면을 나란히 비교할 수 있다.

## 2. 무엇을 했나

### 디자인 기준
- 팔레트: 바탕 `#f7f4ee`, 카드 `#fcfaf5`, 잉크 `#192524`, 본문 `#526260`, 포인트 청록 `#087f70`(랜딩과 동일), 앰버 `#b8793a`(단계 숫자·"이 길도 있어요"·기능 아이콘 원).
- 헤드라인은 Geist 유지(세리프 미도입안). 단계 번호(01·02·03)만 세리프 숫자.
- 헤더는 랜딩 `LandingHeader` 와 같은 구성(NaviMark 로고 · 내비 4개 · 연한 민트 버튼)을 제품 화면에도 적용.
- 토큰·컴포넌트 가이드는 Claude 디자인 시스템 아티팩트에 정리돼 있다(`output/design-mockup/design-tokens_v1.json` 이 토큰 사본).

### 화면별 변경

| 화면 | 미리보기 | 주요 변경 |
|---|---|---|
| 로그인 | `/preview/login-v2` | 좌측 산길 사진 + 커리어 지도 + 3단계, 우측 카드 폼. 데모 안내 문구 원본 유지 |
| 경험 입력 | `/preview/personal-v2` | 히어로(이미지) → 01·02·03 단계 → 입력 카드(필 탭·점선 드롭존·잠금 안내) → 02 특징 → 03 서비스 안내 → CTA 밴드 |
| 분석 중 | 위 화면에서 분석 시작 | 커리어 지도 V2 로 경로가 하나씩 그려짐 |
| 분석 결과 | 위 화면에서 예시 클릭 | 출발점 카드 + **실제 추천 경로 3개를 그린 지도** → 필 탭(추천 경로 / 내 역량 / 다른 직무) → 경로 카드(번호·링 게이지·펼침) |
| 회사 목록 | `/preview/companies-v2` | 히어로 + 검색·필터 4개(산업군·규모·근무형태·채용중, 실동작) + 3열 카드 + 추천 이유 밴드 |
| 회사 상세 | `/preview/companies-v2/[id]` | 탭 → 번호 섹션 한 페이지, 우측 고정 요약 카드 |
| 공고 상세 | `/preview/jobs-v2/[id]` | 필수 역량 카드 청록 강조, 우측 고정 "지원 전 확인", 모바일 하단 바 |
| 지원하기 | `/preview/jobs-v2/[id]/apply` | 자료·절차 번호 섹션 + 데모 확인 카드 |
| 기업 워크스페이스 | `/preview/employer-v2` | 회사·공고 밴드 → KPI 4 → 전형 단계 필 → 검색·필터 → 후보 카드(적합도 링) \| 후보 상세(필수/우대 게이지). **새 공고 만들기는 기존 `PostingComposer` 재사용** |

### 다시 그린 시각화
- `CareerMapV2` — 격자 + 고정 5갈래(장식) 대신, 출발지에서 퍼지는 등고선 위에 **실제 추천 경로**를 그린다. 적합도가 높을수록 가깝고, 도착지 링 채움 = 필수 역량 보유 비율. 좌표계(`lib/career-map` 의 `project`·`routePath`)는 기존 것을 그대로 쓴다. 로딩·로그인에서는 기존 장식 묶음(`ROUTE_ROUNDS`)을 같은 스타일로 그린다.
- `SkillMapV2` — 사분면을 면으로 칠해 '오른쪽 위가 좋은 자리'가 먼저 읽히게 했다.

### 로직 유지 여부
- 분석 API 호출·파일 업로드·데모 예시·결과 데이터 규칙(`jobDetailOf`, 적합도 숨김 등)은 기존 코드를 그대로 복사했다. `RankingTable` · `JobExplorer` · `ShareButton` · `JobRequirements` · `PostingComposer` · `ResumeFileDrop` · `PrivacyNotice` 는 기존 컴포넌트를 그대로 import 한다.
- 데모 로그인 규칙(인증 아님 · 계정 미리 채움 · 안내 문구)은 그대로다.

## 3. 파일 목록 (전부 신규)

```
app/redesign.css                                  공통 토큰·헤더·푸터·버튼 — .navi-v2 아래로만 적용
app/preview/detail-v2.css                         회사 상세·공고 상세·지원하기 공통
app/preview/personal-v2/   page.tsx · personal-v2.css · result-v2.css
app/preview/companies-v2/  page.tsx · companies-v2.css · [companyId]/page.tsx
app/preview/jobs-v2/[postingId]/  page.tsx · apply/page.tsx
app/preview/login-v2/      page.tsx · login-v2.css
app/preview/employer-v2/   page.tsx · employer-v2.css
components/redesign/
  RedesignHeader.tsx  RedesignFooter.tsx(CtaBand 포함)  CompanyMarkV2.tsx
  ResumeInputV2.tsx  RouteSearchLoaderV2.tsx  ResultViewV2.tsx  RouteAccordionV2.tsx  SkillGroupsV2.tsx
  CareerMapV2.tsx  SkillMapV2.tsx
  CompanyDirectoryV2.tsx  DemoApplicationV2.tsx  LoginFormV2.tsx
  EmployerWorkspaceV2.tsx  EmployerCandidateCardV2.tsx  EmployerCandidateDetailV2.tsx
public/redesign/   hero-path.jpg  hero-path-wide.jpg  cta-sunset.jpg  service-wave.jpg  experience-docs.jpg
output/design-mockup/   정적 HTML 시안 · 이미지 생성기 · 토큰 사본 (참고용, 빌드와 무관)
docs/REDESIGN_PREVIEW.md   이 문서
```

검증: `tsc --noEmit` 오류 없음 · `eslint app/preview components/redesign` 오류 없음. `next build` 는 아직 돌리지 않았다(아래 5-1).

## 4. 알려진 이슈

### 4-1. 분석 중 화면(로딩) 지도 — 이전과 다르게 보이던 원인 (이 커밋에서 수정)
1. **1.5초마다 지도 전체가 다시 그려지던 문제** — `RouteSearchLoaderV2` 가 `<CareerMapV2 key={round-reveal}>` 처럼 `reveal` 까지 key 에 넣어, 경로가 하나 늘 때마다 SVG 전체가 다시 마운트됐다. 이미 그려진 경로가 매번 처음부터 다시 그려져 깜빡였다. → key 를 묶음(round) 인덱스로만 바꿨다. 이제 새 경로 하나만 마운트되어 그 경로만 그려진다.
2. **모든 경로가 동시에 숨 쉬던 문제** — `globals.css` 의 `.map-searching .map-route:last-of-type` 은 기존 지도(경로 path 가 한 `<g>` 에 나란히)를 전제로 한다. V2 는 경로마다 `<g>`(바탕선 + 색선)로 감싸므로 각 g 의 마지막 path, 즉 **모든 경로**에 pulse 가 걸렸다. → V2 지도가 마지막 경로 `<g>` 에 `.map-route-last` 를 붙이고, `result-v2.css` 에서 그 경로만 pulse 하도록 되돌렸다.

### 4-2. 남은 이슈 / 미완
- **한글 본문 폰트**: `layout.tsx` 가 Geist 만 로드해 한글은 시스템 폰트(Windows: 맑은 고딕)로 나온다. Noto Sans KR 도입 여부는 팀 결정 후 `layout.tsx` 에서 `next/font/google` 로 추가.
- **기존 상단 바 숨김이 CSS 우회**: `redesign.css` 의 `body:has(.navi-v2) .product-header { display:none }`. 정식 반영 시 `SiteHeader` 를 교체하고 이 규칙을 지운다.
- **`product.css` 의 16px 강제**: `.navi-v2 main.v2-main { font-size:15px }` 로 되돌려 둠. 정식 반영 시 `product.css` 정리.
- **새 공고 만들기**(`PostingComposer`): V2 로 다시 짜지 않고 CSS 로 톤만 맞췄다.
- **공유 카드 이미지**(`/api/og/personal`): 기존 디자인 그대로.
- **`.rv` 등장 애니메이션**은 페이지 로드 시 한 번만 실행된다(스크롤 등장 `LandingReveal` 미적용).
- 결과 화면 지도는 `fitScore` 로 거리를 정한다. `fitScore` 를 숫자로 노출하지 않는 기존 방침과 충돌하지 않지만(거리로만 표현), 팀에서 이견이 있으면 `placeRoutes()` 의 `v` 계산만 바꾸면 된다.

## 5. 현재 서비스 버전에 반영하는 순서

### 5-1. 먼저 확인
```powershell
npm.cmd run dev         # PowerShell 실행 정책에 막히면 npm 대신 npm.cmd
npm.cmd run build       # 빌드 통과 확인 — 아직 돌리지 않았다
```
`/preview/*-v2` 화면을 돌면서 이 문서 4-2 의 항목과 화면별 수정 요청을 정리한다.

### 5-2. 정식 교체 (결정 후)
기존 → V2 대응은 아래와 같다. 한 화면씩 교체하고 그 화면의 미리보기 라우트를 지운다.

| 기존 | V2 |
|---|---|
| `app/personal/page.tsx` | `app/preview/personal-v2/page.tsx` 내용 (경로·import 만 조정) |
| `components/ResumeInput.tsx` · `ResultView.tsx` · `RouteAccordion.tsx` · `SkillGroups.tsx` · `SkillMap.tsx` · `RouteSearchLoader.tsx` | `components/redesign/*V2.tsx` |
| `components/CareerMap.tsx` (히어로 `HeroCareerMap` · 로그인 `LoginJourney` 도 사용) | `CareerMapV2.tsx` — 랜딩 히어로까지 바꿀지는 별도 결정 |
| `app/companies/page.tsx` · `[companyId]/page.tsx` · `CompanyDirectory.tsx` · `CompanyMark.tsx` | `app/preview/companies-v2/*` · `CompanyDirectoryV2` · `CompanyMarkV2` |
| `app/jobs/[postingId]/page.tsx` · `apply/page.tsx` · `DemoApplication.tsx` | `app/preview/jobs-v2/*` · `DemoApplicationV2` |
| `app/login/page.tsx` · `LoginForm.tsx` · `LoginJourney.tsx` | `app/preview/login-v2/*` · `LoginFormV2` (`nextOverride` 제거) |
| `app/employer/page.tsx` · `EmployerWorkspace.tsx` · `EmployerCandidateCard.tsx` · `EmployerCandidateDetail.tsx` | `app/preview/employer-v2/*` · `Employer*V2` |
| `components/SiteHeader.tsx` 의 제품 분기 | `RedesignHeader` (랜딩 분기는 유지) |
| `personal.css` · `companies.css` · `login.css` · `posting.css` · `apply.css` · `employer.css` · `result-view.css` · `route-search-loader.css` | 각 v2 CSS · `detail-v2.css`. `redesign.css` 는 `layout.tsx` 에서 전역 import |

교체하면서 지울 것: `redesign.css` 의 `.product-header` 숨김 규칙과 `main.v2-main` 규칙, `CompanyDirectoryV2` 의 `basePath` 기본값(정식은 `/companies`), 미리보기 내부 링크(`/preview/...` → 실제 경로).

### 5-3. 교체 뒤
```powershell
npm.cmd run verify      # lint · test · data 검증 · build
```
기존 `*.css` 와 컴포넌트는 교체가 끝난 뒤에만 삭제한다. 그 전까지는 두 벌이 공존해도 서로 간섭하지 않는다(모든 V2 규칙이 `.navi-v2` 아래로 한정됨).
