# 제품 화면 리디자인 1차 반영 안내

작성일: 2026-09-17

## 목적

`/personal`, `/companies` 리디자인(미도입안·Sans)을 기존 화면을 건드리지 않고 별도 라우트에서 검토한다.
검토 후 "이대로 반영"이 결정되면 기존 파일을 교체한다. 그 전까지 원본은 수정·삭제하지 않는다.

## 확인 방법

```bash
npm run dev
```

- http://localhost:3000/preview/personal-v2
- http://localhost:3000/preview/companies-v2

기존 화면(`/personal`, `/companies`)은 그대로다.

## 추가된 파일 (전부 신규, 기존 파일 변경 없음)

| 경로 | 역할 |
|---|---|
| `app/redesign.css` | 리디자인 공통 토큰·헤더·푸터·버튼 (`.navi-v2` 아래로만 적용) |
| `app/preview/personal-v2/page.tsx` · `personal-v2.css` | /personal 리디자인 미리보기 |
| `app/preview/companies-v2/page.tsx` · `companies-v2.css` | /companies 리디자인 미리보기 |
| `components/redesign/RedesignHeader.tsx` | 랜딩 헤더와 같은 구성의 제품 상단 바 (NaviMark, 내비 4개, 로그인 상태) |
| `components/redesign/RedesignFooter.tsx` | CTA 밴드 + 푸터 |
| `components/redesign/ResumeInputV2.tsx` | 경험 입력 카드. 분석·예시·파일 로직은 `ResumeInput` 과 동일 |
| `components/redesign/CompanyDirectoryV2.tsx` | 회사 목록. 검색 + 필터 4개(산업군·기업 규모·근무 형태·채용 중) 동작 |
| `public/redesign/*.jpg` | 히어로 2장, 노을 CTA, 서비스 웨이브, 경험 일러스트 |

검증: `tsc --noEmit` 오류 없음, `eslint` 대상 파일 오류 없음.

## 기존 대비 달라진 동작

- **데모 예시 3개**(`SAMPLE_PROFILES`): 사이드바 카드 → 입력 카드 하단 "먼저 결과가 궁금하다면" 텍스트 링크
- **입력 내용 안내**(`PrivacyNotice`): 항상 펼침 → 잠금 아이콘 한 줄 + `<details>` 로 펼침. 문구는 원본 그대로
- **성장 단계 태그**: 회사 카드 메타 행 4번째 항목
- **가상 데이터 고지**: 히어로 아래 배너 → 푸터 한 곳
- **기본 탭**: 직접 입력 → 파일 업로드 (시안 기준). 글자 수 미달 시 직접 입력 탭으로 자동 전환
- 결과 화면(`ResultView`)은 기존 컴포넌트 그대로

## 임시 조치 (정식 반영 시 정리할 것)

- `layout.tsx` 를 수정하지 않기 위해 `redesign.css` 에서 `body:has(.navi-v2) .product-header { display:none }` 로 기존 상단 바를 숨기고 `RedesignHeader` 를 그린다. 정식 반영 시 `SiteHeader` 의 제품 분기를 `RedesignHeader` 로 교체하고 이 규칙을 지운다.
- `product.css` 가 `main` 에 16px 를 강제해 `.navi-v2 main.v2-main` 으로 15px 를 되돌린다. 정식 반영 시 `product.css` 의 해당 규칙을 조정한다.
- 한글 본문 폰트: 레이아웃이 Geist 만 로드하므로 한글은 시스템 폰트로 나온다. Noto Sans KR 도입 여부는 별도 결정.

## 정식 반영 시 교체 대상

- `app/personal/page.tsx` → `app/preview/personal-v2/page.tsx` 내용으로
- `components/ResumeInput.tsx` → `ResumeInputV2.tsx`
- `app/companies/page.tsx`, `components/CompanyDirectory.tsx` → v2
- `components/SiteHeader.tsx` 제품 분기 → `RedesignHeader`
- `personal.css`, `companies.css` → v2 CSS 로 교체, `redesign.css` 는 `layout.tsx` 에서 전역 import
