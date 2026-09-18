# 제품 화면 리디자인 1차 반영 안내 (v2 — 전 화면)

작성일: 2026-09-17 · v1 에서 추가된 화면: 결과·로딩·로그인·회사 상세·공고 상세·지원하기·기업 워크스페이스

## 목적

제품 화면 전체 리디자인(미도입안·Sans)을 기존 화면을 건드리지 않고 별도 라우트에서 검토한다.
검토 후 "이대로 반영"이 결정되면 기존 파일을 교체한다. 그 전까지 원본은 수정·삭제하지 않는다.

## 확인 방법

```powershell
npm.cmd run dev      # 또는 실행 정책 완화 후 npm run dev
```

| 화면 | 미리보기 주소 | 기존 |
|---|---|---|
| 로그인 | /preview/login-v2 | /login |
| 개인 · 경험 입력 → 분석 중 → 결과 | /preview/personal-v2 | /personal |
| 회사 목록 | /preview/companies-v2 | /companies |
| 회사 상세 | /preview/companies-v2/[id] | /companies/[id] |
| 공고 상세 | /preview/jobs-v2/[id] | /jobs/[id] |
| 지원하기 | /preview/jobs-v2/[id]/apply | /jobs/[id]/apply |
| 기업 워크스페이스 | /preview/employer-v2 | /employer |

미리보기 안의 링크는 모두 미리보기 라우트끼리 이어진다(로그인 → personal-v2 / employer-v2, 회사 목록 → 회사 상세 → 공고 → 지원).
결과 화면은 `/preview/personal-v2` 에서 "먼저 결과가 궁금하다면" 예시를 누르면 API 호출 없이 바로 볼 수 있다.

## 추가된 파일 (전부 신규, 기존 파일 변경 없음)

```
app/redesign.css                          공통 토큰·헤더·푸터·버튼 (.navi-v2 아래로만 적용)
app/preview/detail-v2.css                 회사 상세·공고 상세·지원하기 공통
app/preview/personal-v2/{page.tsx, personal-v2.css, result-v2.css}
app/preview/companies-v2/{page.tsx, companies-v2.css, [companyId]/page.tsx}
app/preview/jobs-v2/[postingId]/{page.tsx, apply/page.tsx}
app/preview/login-v2/{page.tsx, login-v2.css}
app/preview/employer-v2/{page.tsx, employer-v2.css}
components/redesign/
  RedesignHeader · RedesignFooter(CtaBand) · CompanyMarkV2
  ResumeInputV2 · RouteSearchLoaderV2 · ResultViewV2 · RouteAccordionV2 · SkillGroupsV2
  CareerMapV2 · SkillMapV2
  CompanyDirectoryV2 · DemoApplicationV2 · LoginFormV2
  EmployerWorkspaceV2 · EmployerCandidateCardV2 · EmployerCandidateDetailV2
public/redesign/*.jpg                     히어로 2장, 노을 CTA, 서비스 웨이브, 경험 일러스트
```

검증: `tsc --noEmit` 오류 없음, `eslint app/preview components/redesign` 오류 없음.

## 다시 그린 시각화

- **CareerMapV2** — 격자 바닥·고정 5갈래(장식) → 출발지에서 퍼지는 등고선 바닥 위에 **실제 추천 경로 3개**를 그린다. 적합도가 높을수록 가깝고, 도착지 링의 채움이 필수 역량 보유 비율. '이 길도 있어요'는 앰버. 로딩·로그인에서는 기존 `lib/career-map` 의 장식 묶음을 같은 스타일로 그린다. 좌표계(`project`·`routePath`)는 기존 것을 그대로 쓴다.
- **SkillMapV2** — 사분면을 면으로 칠해 '오른쪽 위가 좋은 자리'를 먼저 읽게 했다. 피벗 무기 청록 채움, 락인 잉크 테두리, 기본기 모래색.

## 기존 대비 달라진 동작

- 결과 화면: 출발점 카드에 확인된 역량 수·추천 경로 수·몰랐던 길 수를 함께 표시. 추천 경로 카드는 번호 + 링 게이지 + 펼침(추천 근거 · 예상 준비/난이도/연봉 구간/전망 · 요구 역량 · 채워야 할 것). 탭은 필 형태. RankingTable · JobExplorer · ShareButton · JobRequirements 는 기존 컴포넌트 재사용.
- 로그인: 좌측 산길 사진 위 스토리 + 지도, 우측 카드 폼. 미리보기에서는 로그인 후 `/preview/...-v2` 로 이동(`nextOverride`).
- 회사 상세: 탭 → 번호 섹션(01 채용 공고 · 02 소개 · 03 일하는 방식)으로 한 페이지에 나열, 우측 고정 요약 카드.
- 공고 상세: 필수 역량 카드에 청록 강조, 우측 고정 "지원 전 확인" 카드. 모바일은 하단 고정 바.
- 기업 워크스페이스: 회사·공고 선택 밴드 → KPI 4개 → 전형 단계 필 → 검색·필터 → 후보 카드(적합도 링) | 후보 상세(필수/우대 커버율 게이지). **새 공고 만들기는 기존 `PostingComposer` 를 그대로 쓰고 CSS 로 톤만 맞췄다** — 2차에서 V2 로 교체 예정.

## 임시 조치 (정식 반영 시 정리할 것)

- `redesign.css` 의 `body:has(.navi-v2) .product-header { display:none }` — `layout.tsx` 를 건드리지 않기 위한 우회. 정식 반영 시 `SiteHeader` 제품 분기를 `RedesignHeader` 로 교체하고 삭제.
- `.navi-v2 main.v2-main { font-size:15px }` — `product.css` 의 16px 강제를 되돌림. 정식 반영 시 `product.css` 조정.
- 한글 본문: 레이아웃이 Geist 만 로드해 시스템 폰트로 나온다. Noto Sans KR 도입은 별도 결정.
- `ShareButton` 의 공유 카드 이미지(`/api/og/personal`)는 기존 디자인 그대로다.

## 정식 반영 시 교체 대상

| 기존 | → V2 |
|---|---|
| `app/personal/page.tsx` · `components/ResumeInput.tsx` · `ResultView.tsx` · `RouteAccordion.tsx` · `SkillGroups.tsx` · `SkillMap.tsx` · `RouteSearchLoader.tsx` · `CareerMap.tsx` | `preview/personal-v2/page.tsx` · `components/redesign/*V2` |
| `app/companies/page.tsx` · `[companyId]/page.tsx` · `CompanyDirectory.tsx` · `CompanyMark.tsx` | `preview/companies-v2/*` · `CompanyDirectoryV2` · `CompanyMarkV2` |
| `app/jobs/[postingId]/page.tsx` · `apply/page.tsx` · `DemoApplication.tsx` | `preview/jobs-v2/*` · `DemoApplicationV2` |
| `app/login/page.tsx` · `LoginForm.tsx` · `LoginJourney.tsx` | `preview/login-v2/*` · `LoginFormV2` |
| `app/employer/page.tsx` · `EmployerWorkspace.tsx` · `EmployerCandidateCard.tsx` · `EmployerCandidateDetail.tsx` | `preview/employer-v2/*` · `Employer*V2` |
| `components/SiteHeader.tsx` 제품 분기 | `RedesignHeader` |
| `personal.css` · `companies.css` · `login.css` · `posting.css` · `apply.css` · `employer.css` · `result-view.css` · `route-search-loader.css` | v2 CSS, `redesign.css` 는 `layout.tsx` 전역 import |
