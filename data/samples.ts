import type { SampleProfile } from '@/types';
import type { Extracted } from '@/lib/llm';
import { buildAnalysis } from '@/lib/scoring';

// ============================================================================
//  샘플 프로필 — 심사위원·투표자는 자기 이력서를 넣지 않는다.
//
//  ⚠️ 결과를 손으로 적어두지 않는다.
//     예전에는 AnalysisResult 를 통째로 하드코딩해 뒀는데, 온톨로지가 자라면서
//     이름이 어긋났다 (직무 4개 · 스킬 9개가 사전에 없는 이름이었다).
//     화면이 문자열만 뿌릴 때는 안 보였지만, 매트릭스에서 값을 끌어오기
//     시작하자 샘플에서만 상세가 비는 문제로 드러났다.
//     isHiddenRoute 도 손으로 true 를 적어 둔 것이어서, 실제 알고리즘이
//     히든 경로를 못 만들고 있다는 사실이 데모에서 가려져 있었다.
//
//  → 여기서는 '이력서에서 무엇을 뽑았는가'(Extracted)만 적고,
//    점수·경로·근거는 실제 파이프라인(buildAnalysis)이 계산한다.
//    · 이름이 사전과 어긋날 수 없다
//    · 팀원이 공고를 더 모으면 샘플 결과도 함께 갱신된다
//    · 화면에 보이는 것이 실제 사용자가 받는 것과 같다
//    · LLM 호출은 여전히 0회다 (추출 단계만 건너뛴다)
//
//  skillCandidates.name 은 반드시 data/interim/skills.json 의 name·alias 중
//  하나여야 한다. evidenceText 는 resumeText 안의 표현을 그대로 쓴다 —
//  화면에 "내 이력서 — …" 로 그대로 노출되기 때문이다.
// ============================================================================

interface SampleInput {
  id: string;
  label: string;
  hint: string;
  resumeText: string;
  extracted: Extracted;
}

const INPUTS: SampleInput[] = [
  {
    id: 'sp_marketer',
    label: '그로스 마케터 5년차',
    hint: '기획 직군 전환을 고민 중',
    resumeText:
      '그로스 마케터 5년차입니다. 결제 퍼널 A/B 테스트를 설계해 전환율을 12% 개선했고, 이탈 고객 20명 인터뷰를 통해 온보딩 개선 과제를 정의했습니다. 주간 지표 대시보드를 직접 SQL로 작성해 운영했습니다.',
    extracted: {
      currentPosition: {
        jobTitle: '그로스 마케터',
        jobFamily: '기획',
        careerMonths: 60,
        industry: 'IT/서비스',
        summary: '퍼널을 실험으로 개선하고 그 결과를 지표로 확인해 온 5년차 그로스 마케터',
      },
      skillCandidates: [
        { name: 'A/B 테스트 설계', evidenceText: '결제 퍼널 A/B 테스트를 설계해 전환율을 12% 개선', isQuantified: true },
        { name: '퍼널 분석', evidenceText: '결제 퍼널의 이탈 구간을 단계별로 분해해 원인을 좁힘' },
        { name: '사용자 인터뷰', evidenceText: '이탈 고객 20명 인터뷰를 통해 온보딩 개선 과제를 정의' },
        { name: '지표 설계', evidenceText: '주간 지표 대시보드를 직접 SQL로 작성해 운영' },
        { name: '데이터 분석', evidenceText: '주차별 전환율 변화를 집계해 실험 결과를 판정' },
        { name: '성과 분석', evidenceText: '캠페인별 기여도를 나눠 예산 배분 근거로 사용' },
        { name: 'SQL', evidenceText: '주간 지표 대시보드를 직접 SQL로 작성해 운영' },
      ],
    },
  },
  {
    id: 'sp_frontend',
    label: '프론트엔드 개발자 3년차',
    hint: '개발 외 다른 길이 있는지 궁금',
    resumeText:
      '프론트엔드 개발자 3년차입니다. 재사용 컴포넌트 40여 개를 정리해 사내 UI 라이브러리로 배포했고, 온보딩 애니메이션을 직접 설계해 이탈률을 9% 줄였습니다. 번들 크기를 절반으로 줄여 초기 로딩을 2.1초 단축했습니다. 디자인 시스템 토큰을 디자이너와 함께 정의하고 Figma 라이브러리와 코드 컴포넌트를 1:1로 맞췄습니다. 새 기능은 클릭 가능한 프로토타입으로 먼저 만들어 팀 리뷰를 받았습니다.',
    extracted: {
      currentPosition: {
        jobTitle: '프론트엔드 개발자',
        jobFamily: '개발',
        careerMonths: 38,
        industry: 'IT/서비스',
        summary: '사용자가 만지는 화면을 만들며 인터랙션 품질을 챙겨 온 3년차 프론트엔드 개발자',
      },
      skillCandidates: [
        { name: '컴포넌트 설계', evidenceText: '재사용 컴포넌트 40여 개를 정리해 사내 UI 라이브러리로 배포', isQuantified: true },
        { name: '인터랙션 구현', evidenceText: '온보딩 애니메이션을 직접 설계해 이탈률을 9% 줄임' },
        { name: '성능 최적화', evidenceText: '번들 크기를 절반으로 줄여 초기 로딩을 2.1초 단축' },
        { name: '접근성(A11y)', evidenceText: '스크린리더 대응을 전 페이지에 적용' },
        { name: '개발 핸드오프', evidenceText: '디자이너 시안과 구현 결과를 대조하는 검수 절차를 팀에 정착' },
        { name: 'React', evidenceText: 'React 기반 서비스 3개를 운영' },
        { name: 'TypeScript', evidenceText: '전 프로젝트를 TypeScript로 마이그레이션' },
        { name: 'Git', evidenceText: '코드 리뷰 문화를 팀에 도입' },
        { name: '디자인 시스템', evidenceText: '디자인 시스템 토큰을 디자이너와 함께 정의' },
        { name: 'Figma', evidenceText: 'Figma 라이브러리와 코드 컴포넌트를 1:1로 맞춤' },
        { name: '프로토타이핑', evidenceText: '새 기능은 클릭 가능한 프로토타입으로 먼저 만들어 팀 리뷰를 받음' },
        { name: 'UX/UI', evidenceText: '온보딩 애니메이션을 직접 설계해 이탈률을 9% 줄임' },
      ],
    },
  },
  {
    id: 'sp_jobseeker',
    label: '취업준비생 · 비전공',
    hint: '경력은 없지만 만들어 본 건 있음',
    resumeText:
      '국문학과를 졸업하고 취업을 준비하고 있습니다. 교내 커뮤니티 앱 개선 과제에서 이용자 12명을 인터뷰해 불편 지점을 정리했고, 학과 학회 홈페이지의 메뉴를 다시 짜서 자료 찾는 단계를 줄였습니다. 팀 프로젝트에서 기능 명세서를 작성해 개발 담당 팀원과 조율했고, 학회 행사 만족도 설문을 직접 설계해 응답 210건을 수집·집계했습니다.',
    extracted: {
      currentPosition: {
        jobTitle: '신입',
        jobFamily: '기획',
        careerMonths: 0,
        industry: null,
        summary: '경력은 없지만 사용자를 만나 문제를 정의하고 문서로 정리해 본 경험이 있는 취업준비생',
      },
      skillCandidates: [
        { name: '사용자 인터뷰', evidenceText: '교내 커뮤니티 앱 개선 과제에서 이용자 12명을 인터뷰해 불편 지점을 정리' },
        { name: '정보 구조 설계', evidenceText: '학과 학회 홈페이지의 메뉴를 다시 짜서 자료 찾는 단계를 줄임' },
        { name: '요구사항 정의', evidenceText: '팀 프로젝트에서 기능 명세서를 작성' },
        { name: '이해관계자 조율', evidenceText: '기능 명세서를 작성해 개발 담당 팀원과 조율' },
        { name: '데이터 분석', evidenceText: '만족도 설문을 직접 설계해 응답 210건을 수집·집계', isQuantified: true },
      ],
    },
  },
  {
    id: 'sp_designer',
    label: 'UI 디자이너 4년차',
    hint: '커리어 폭을 넓히고 싶음',
    resumeText:
      'UI 디자이너 4년차입니다. 컬러·타이포·컴포넌트 규칙을 문서화해 4개 팀에 배포했고, 메뉴 구조를 재편해 주요 기능 도달 단계를 4단계에서 2단계로 줄였습니다. 컴포넌트 스펙 문서를 만들어 개발 문의를 절반으로 줄였습니다. 랜딩 페이지는 HTML·CSS를 직접 고쳐 배포했고, 컴포넌트 스타일을 바꿀 때는 JavaScript 동작까지 확인한 뒤 개발자에게 넘겼습니다. 분기마다 이용자 5명을 불러 사용성 테스트를 진행해 다음 개선 과제를 정했습니다.',
    extracted: {
      currentPosition: {
        jobTitle: 'UI 디자이너',
        jobFamily: '디자인',
        careerMonths: 48,
        industry: 'IT/서비스',
        summary: '규칙을 문서로 남겨 여러 팀이 같은 기준으로 화면을 만들게 해 온 4년차 UI 디자이너',
      },
      skillCandidates: [
        { name: '디자인 시스템', evidenceText: '컬러·타이포·컴포넌트 규칙을 문서화해 4개 팀에 배포', isQuantified: true },
        { name: '시각 위계 설계', evidenceText: '컬러·타이포 규칙으로 화면의 읽는 순서를 통일' },
        { name: '정보 구조 설계', evidenceText: '메뉴 구조를 재편해 주요 기능 도달 단계를 4단계에서 2단계로 줄임' },
        { name: '컴포넌트 설계', evidenceText: '컴포넌트 스펙 문서를 만들어 개발 문의를 절반으로 줄임' },
        { name: '개발 핸드오프', evidenceText: '컴포넌트 스펙 문서를 만들어 개발 문의를 절반으로 줄임' },
        { name: '프로토타이핑', evidenceText: '주요 흐름을 클릭 가능한 시안으로 만들어 팀 리뷰에 사용' },
        { name: 'Figma', evidenceText: '컴포넌트 규칙을 Figma 라이브러리로 배포' },
        { name: 'HTML', evidenceText: '랜딩 페이지는 HTML·CSS를 직접 고쳐 배포' },
        { name: 'CSS', evidenceText: '랜딩 페이지는 HTML·CSS를 직접 고쳐 배포' },
        { name: 'JavaScript', evidenceText: '컴포넌트 스타일을 바꿀 때는 JavaScript 동작까지 확인한 뒤 개발자에게 넘김' },
        { name: 'UX/UI', evidenceText: '메뉴 구조를 재편해 주요 기능 도달 단계를 4단계에서 2단계로 줄임' },
        { name: '사용성 테스트', evidenceText: '분기마다 이용자 5명을 불러 사용성 테스트를 진행해 다음 개선 과제를 정함' },
      ],
    },
  },
];

export const SAMPLE_PROFILES: SampleProfile[] = INPUTS.map(
  ({ extracted, ...rest }) => ({ ...rest, cachedResult: buildAnalysis(extracted) })
);
