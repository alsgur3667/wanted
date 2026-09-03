import type { SampleProfile, AnalysisResult } from '@/types';
import marketer from './mock-result.json';

// 심사위원·투표자는 자기 이력서를 넣지 않는다.
// 사전 계산된 결과를 붙여두면 응답 즉시 + LLM 호출 0.

const devResult: AnalysisResult = {
  version: '1.0',
  currentPosition: {
    jobTitle: '프론트엔드 개발자',
    jobFamily: '개발',
    careerMonths: 38,
    industry: 'IT/서비스',
    summary: '사용자가 만지는 화면을 만들며 인터랙션 품질을 챙겨 온 3년차 프론트엔드 개발자',
  },
  skills: [
    { id: 'd1', name: '컴포넌트 설계', quadrant: 'leverage', spread: 0.72, scarcity: 0.66, proficiency: 0.85, evidence: '재사용 컴포넌트 40여 개를 정리해 사내 UI 라이브러리로 배포' },
    { id: 'd2', name: '인터랙션 구현', quadrant: 'leverage', spread: 0.68, scarcity: 0.7, proficiency: 0.8, evidence: '온보딩 애니메이션을 직접 설계해 이탈률 9% 감소' },
    { id: 'd3', name: '웹 성능 최적화', quadrant: 'leverage', spread: 0.63, scarcity: 0.74, proficiency: 0.75, evidence: '번들 크기를 절반으로 줄여 초기 로딩 2.1초 단축' },
    { id: 'd4', name: '접근성(A11y)', quadrant: 'leverage', spread: 0.58, scarcity: 0.81, proficiency: 0.6, evidence: '스크린리더 대응을 전 페이지에 적용' },
    { id: 'd5', name: 'TypeScript', quadrant: 'common', spread: 0.78, scarcity: 0.28, proficiency: 0.9, evidence: '전 프로젝트를 TypeScript로 마이그레이션' },
    { id: 'd6', name: 'React', quadrant: 'common', spread: 0.74, scarcity: 0.22, proficiency: 0.9, evidence: 'React 기반 서비스 3개를 운영' },
    { id: 'd7', name: '디자인 QA', quadrant: 'lockin', spread: 0.31, scarcity: 0.63, proficiency: 0.7, evidence: '디자이너와 시안 대비 픽셀 검수 프로세스를 정착' },
    { id: 'd8', name: 'Git 협업', quadrant: 'common', spread: 0.93, scarcity: 0.1, proficiency: 0.85, evidence: '코드 리뷰 문화를 팀에 도입' },
  ],
  routes: [
    {
      id: 'dr1', destination: '프로덕트 디자이너', jobFamily: '디자인',
      fitScore: 73, surpriseScore: 86, isHiddenRoute: true,
      difficulty: 'moderate', estimatedMonths: 7,
      bridgeSkills: ['인터랙션 구현', '컴포넌트 설계', '접근성(A11y)', '디자인 QA'],
      gapSkills: [
        { name: '시각 위계 설계', difficulty: 0.55, firstStep: '최근 만든 화면 하나를 여백·크기·대비만으로 다시 정리해 before/after로 남겨 보세요.' },
        { name: '사용자 리서치', difficulty: 0.5, firstStep: '직접 만든 기능을 쓰는 동료 3명에게 화면을 보여주고 막히는 지점을 기록해 보세요.' },
      ],
      reason: '인터랙션을 이미 설계하고 있고 컴포넌트 단위로 사고합니다. 디자이너가 하는 일의 상당 부분을 코드로 해 온 셈인데, 직무명이 달라 잘 보이지 않는 경로입니다.',
      marketNote: '디자인 시스템을 다루는 조직에서 개발 출신 디자이너 수요가 있습니다.',
    },
    {
      id: 'dr2', destination: '프로덕트 매니저', jobFamily: '기획',
      fitScore: 69, surpriseScore: 34, isHiddenRoute: false,
      difficulty: 'challenging', estimatedMonths: 10,
      bridgeSkills: ['컴포넌트 설계', '디자인 QA', 'Git 협업'],
      gapSkills: [
        { name: '지표 설계', difficulty: 0.6, firstStep: '지금 맡은 화면의 성공 지표를 하나 정하고 측정 방법을 문서로 써 보세요.' },
        { name: '우선순위 관리', difficulty: 0.5, firstStep: '팀 백로그를 임팩트·공수 2축으로 정렬해 팀에 공유해 보세요.' },
      ],
      reason: '구현 관점에서 스펙의 빈틈을 잡아 온 경험이 요구사항 정의와 직결됩니다.',
      marketNote: null,
    },
    {
      id: 'dr3', destination: '데이터 엔지니어', jobFamily: '개발',
      fitScore: 61, surpriseScore: 41, isHiddenRoute: false,
      difficulty: 'challenging', estimatedMonths: 12,
      bridgeSkills: ['TypeScript', 'Git 협업', '웹 성능 최적화'],
      gapSkills: [
        { name: 'SQL / 데이터 모델링', difficulty: 0.65, firstStep: '지금 서비스의 이벤트 로그 스키마를 직접 그려 보세요.' },
        { name: '파이프라인 운영', difficulty: 0.75, firstStep: '작은 배치 작업 하나를 스케줄러로 자동화해 보세요.' },
      ],
      reason: '성능 병목을 추적해 개선한 방식이 데이터 파이프라인 튜닝과 접근법이 같습니다.',
      marketNote: null,
    },
  ],
  generatedAt: '2026-09-01T09:00:00.000Z',
};

const designerResult: AnalysisResult = {
  version: '1.0',
  currentPosition: {
    jobTitle: 'UI 디자이너',
    jobFamily: '디자인',
    careerMonths: 50,
    industry: 'IT/서비스',
    summary: '일관된 화면 규칙을 만들어 온 4년차 UI 디자이너',
  },
  skills: [
    { id: 'g1', name: '디자인 시스템 구축', quadrant: 'leverage', spread: 0.7, scarcity: 0.78, proficiency: 0.9, evidence: '컬러·타이포·컴포넌트 규칙을 문서화해 4개 팀에 배포' },
    { id: 'g2', name: '정보 구조 설계', quadrant: 'leverage', spread: 0.75, scarcity: 0.68, proficiency: 0.75, evidence: '메뉴 구조를 재편해 주요 기능 도달 단계를 4단계에서 2단계로 축소' },
    { id: 'g3', name: '프로토타이핑', quadrant: 'leverage', spread: 0.66, scarcity: 0.6, proficiency: 0.85, evidence: '인터랙티브 프로토타입으로 개발 전 3차례 검증' },
    { id: 'g4', name: '사용성 테스트', quadrant: 'leverage', spread: 0.71, scarcity: 0.72, proficiency: 0.65, evidence: '사용자 8명 대상 과업 기반 테스트를 설계·진행' },
    { id: 'g5', name: 'Figma', quadrant: 'common', spread: 0.62, scarcity: 0.18, proficiency: 0.95, evidence: 'Figma 라이브러리를 단독 운영' },
    { id: 'g6', name: '비주얼 스타일링', quadrant: 'lockin', spread: 0.29, scarcity: 0.55, proficiency: 0.9, evidence: '브랜드 리뉴얼에 맞춰 전 화면 비주얼을 재정비' },
    { id: 'g7', name: '개발 핸드오프', quadrant: 'leverage', spread: 0.6, scarcity: 0.64, proficiency: 0.8, evidence: '컴포넌트 스펙 문서를 만들어 개발 문의를 절반으로 줄임' },
    { id: 'g8', name: '협업 커뮤니케이션', quadrant: 'common', spread: 0.92, scarcity: 0.11, proficiency: 0.8, evidence: '기획·개발과 주간 리뷰를 주도' },
  ],
  routes: [
    {
      id: 'gr1', destination: '디자인 시스템 엔지니어', jobFamily: '개발',
      fitScore: 74, surpriseScore: 88, isHiddenRoute: true,
      difficulty: 'moderate', estimatedMonths: 8,
      bridgeSkills: ['디자인 시스템 구축', '개발 핸드오프', '프로토타이핑', '정보 구조 설계'],
      gapSkills: [
        { name: 'React 컴포넌트 작성', difficulty: 0.6, firstStep: '만든 버튼 컴포넌트 하나를 실제 코드로 구현해 Storybook에 올려 보세요.' },
        { name: '토큰 파이프라인', difficulty: 0.55, firstStep: 'Figma 변수를 JSON으로 내보내 CSS 변수로 변환해 보세요.' },
      ],
      reason: '이미 컴포넌트 규칙과 스펙 문서를 만들고 있습니다. 그 산출물을 코드로 옮기는 직무가 따로 존재하는데, 채용공고에 잘 노출되지 않아 모르고 지나치기 쉽습니다.',
      marketNote: '디자인 시스템을 운영하는 조직에서 수요가 늘고 있습니다.',
    },
    {
      id: 'gr2', destination: '프로덕트 디자이너', jobFamily: '디자인',
      fitScore: 81, surpriseScore: 18, isHiddenRoute: false,
      difficulty: 'easy', estimatedMonths: 4,
      bridgeSkills: ['정보 구조 설계', '사용성 테스트', '프로토타이핑'],
      gapSkills: [
        { name: '비즈니스 지표 연결', difficulty: 0.5, firstStep: '최근 개선한 화면이 어떤 지표를 움직였는지 데이터로 확인해 보세요.' },
        { name: '문제 정의', difficulty: 0.45, firstStep: '다음 과제를 화면이 아니라 "무엇이 문제인가"부터 한 장으로 써 보세요.' },
      ],
      reason: '사용성 테스트로 문제를 찾아 온 과정이 프로덕트 디자인의 앞단과 그대로 겹칩니다.',
      marketNote: null,
    },
    {
      id: 'gr3', destination: '서비스 기획자', jobFamily: '기획',
      fitScore: 70, surpriseScore: 37, isHiddenRoute: false,
      difficulty: 'moderate', estimatedMonths: 6,
      bridgeSkills: ['정보 구조 설계', '협업 커뮤니케이션', '개발 핸드오프'],
      gapSkills: [
        { name: '정책·예외 설계', difficulty: 0.55, firstStep: '담당 화면의 예외 케이스를 모두 적어 정책표로 만들어 보세요.' },
        { name: '요구사항 문서', difficulty: 0.4, firstStep: '다음 과제를 화면 없이 글로만 설명하는 문서로 먼저 써 보세요.' },
      ],
      reason: '화면 흐름과 예외를 이미 설계하고 있어, 산출물 형식만 바뀌는 경로입니다.',
      marketNote: null,
    },
  ],
  generatedAt: '2026-09-01T09:00:00.000Z',
};

const jobseekerResult: AnalysisResult = {
  version: '1.0',
  currentPosition: {
    jobTitle: '신입',
    jobFamily: '기획',
    careerMonths: 0,
    industry: null,
    summary: '사람들이 어디서 막히는지 직접 물어보고 글과 구조로 풀어 온 취업준비생',
  },
  skills: [
    { id: 'n1', name: '사용자 인터뷰', quadrant: 'leverage', spread: 0.74, scarcity: 0.62, proficiency: 0.55, evidence: '교내 커뮤니티 앱 개선 과제에서 이용자 12명을 인터뷰해 불편 지점을 정리' },
    { id: 'n2', name: '정보 구조 설계', quadrant: 'leverage', spread: 0.75, scarcity: 0.68, proficiency: 0.5, evidence: '학과 학회 홈페이지의 메뉴를 다시 짜서 자료 찾는 단계를 줄임' },
    { id: 'n3', name: '요구사항 정의', quadrant: 'leverage', spread: 0.79, scarcity: 0.58, proficiency: 0.45, evidence: '팀 프로젝트에서 기능 명세서를 작성해 개발 담당 팀원과 조율' },
    { id: 'n4', name: '설문 설계', quadrant: 'leverage', spread: 0.66, scarcity: 0.64, proficiency: 0.6, evidence: '학회 행사 만족도 설문을 직접 설계해 응답 210건 수집' },
    { id: 'n5', name: '문서 작성', quadrant: 'leverage', spread: 0.83, scarcity: 0.52, proficiency: 0.75, evidence: '국문학 전공 과정에서 장문 보고서를 반복 작성' },
    { id: 'n6', name: '데이터 정리', quadrant: 'common', spread: 0.86, scarcity: 0.3, proficiency: 0.5, evidence: '설문 응답 210건을 스프레드시트로 집계해 항목별 비교표 작성' },
    { id: 'n7', name: '콘텐츠 기획', quadrant: 'lockin', spread: 0.36, scarcity: 0.55, proficiency: 0.65, evidence: '학회 SNS 콘텐츠를 6개월간 주 2회 기획·발행' },
    { id: 'n8', name: '협업 커뮤니케이션', quadrant: 'common', spread: 0.92, scarcity: 0.11, proficiency: 0.6, evidence: '4인 팀 프로젝트에서 일정과 역할 분배를 조율' },
  ],
  routes: [
    {
      id: 'nr1', destination: '서비스 기획자', jobFamily: '기획',
      fitScore: 68, surpriseScore: 24, isHiddenRoute: false,
      difficulty: 'moderate', estimatedMonths: 5,
      bridgeSkills: ['요구사항 정의', '정보 구조 설계', '사용자 인터뷰', '문서 작성'],
      gapSkills: [
        { name: '정책·예외 설계', difficulty: 0.55, firstStep: '만든 프로젝트의 예외 상황을 전부 적어 정책표로 만들어 보세요.' },
        { name: '지표 설계', difficulty: 0.6, firstStep: '프로젝트에 성공 지표를 하나 정하고 측정 방법까지 문서로 써 보세요.' },
      ],
      reason: '기능 명세서를 쓰고 사용자에게 직접 물어본 과정이 서비스 기획 업무의 앞단과 같습니다. 직장 경력이 없어도 과정 자체는 동일합니다.',
      marketNote: '신입 채용이 꾸준한 직무입니다.',
    },
    {
      id: 'nr2', destination: 'UX 라이터', jobFamily: '디자인',
      fitScore: 64, surpriseScore: 87, isHiddenRoute: true,
      difficulty: 'easy', estimatedMonths: 4,
      bridgeSkills: ['문서 작성', '사용자 인터뷰', '정보 구조 설계', '콘텐츠 기획'],
      gapSkills: [
        { name: '마이크로카피 원칙', difficulty: 0.4, firstStep: '자주 쓰는 앱의 오류 메시지 5개를 골라 더 나은 문구로 고쳐 써 보세요.' },
        { name: '디자인 도구 기초', difficulty: 0.35, firstStep: 'Figma로 화면 하나를 그려 문구를 직접 얹어 보세요.' },
      ],
      reason: '글로 구조를 만드는 일을 이미 해 왔습니다. 화면 안의 문구를 설계하는 직무가 따로 있는데, 전공이 국문학이면 오히려 강점이 되는데도 채용공고에 잘 노출되지 않아 모르고 지나치기 쉽습니다.',
      marketNote: null,
    },
    {
      id: 'nr3', destination: '데이터 분석가', jobFamily: '기획',
      fitScore: 52, surpriseScore: 46, isHiddenRoute: false,
      difficulty: 'challenging', estimatedMonths: 9,
      bridgeSkills: ['설문 설계', '데이터 정리'],
      gapSkills: [
        { name: 'SQL', difficulty: 0.5, firstStep: '공개 데이터셋 하나를 받아 조건에 맞는 행을 뽑는 쿼리를 써 보세요.' },
        { name: '통계적 유의성 검정', difficulty: 0.6, firstStep: '설문 결과에서 두 집단 차이가 우연인지 직접 계산해 보세요.' },
      ],
      reason: '설문을 설계하고 210건을 직접 집계한 경험이 분석 업무의 출발점과 같습니다. 도구를 익히는 기간이 필요합니다.',
      marketNote: null,
    },
  ],
  generatedAt: '2026-09-02T09:00:00.000Z',
};

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    id: 'sp_marketer',
    label: '그로스 마케터 5년차',
    hint: '기획 직군 전환을 고민 중',
    resumeText: '그로스 마케터 5년차입니다. 결제 퍼널 A/B 테스트를 설계해 전환율을 12% 개선했고, 이탈 고객 20명 인터뷰를 통해 온보딩 개선 과제를 정의했습니다. 주간 지표 대시보드를 직접 SQL로 작성해 운영했습니다.',
    cachedResult: marketer as AnalysisResult,
  },
  {
    id: 'sp_frontend',
    label: '프론트엔드 개발자 3년차',
    hint: '개발 외 다른 길이 있는지 궁금',
    resumeText: '프론트엔드 개발자 3년차입니다. 재사용 컴포넌트 40여 개를 정리해 사내 UI 라이브러리로 배포했고, 온보딩 애니메이션을 직접 설계해 이탈률을 9% 줄였습니다. 번들 크기를 절반으로 줄여 초기 로딩을 2.1초 단축했습니다.',
    cachedResult: devResult,
  },
  {
    id: 'sp_jobseeker',
    label: '취업준비생 · 비전공',
    hint: '경력은 없지만 만들어 본 건 있음',
    resumeText: '국문학과를 졸업하고 취업을 준비하고 있습니다. 교내 커뮤니티 앱 개선 과제에서 이용자 12명을 인터뷰해 불편 지점을 정리했고, 학과 학회 홈페이지의 메뉴를 다시 짜서 자료 찾는 단계를 줄였습니다. 팀 프로젝트에서 기능 명세서를 작성해 개발 담당 팀원과 조율했고, 학회 행사 만족도 설문을 직접 설계해 응답 210건을 수집·집계했습니다.',
    cachedResult: jobseekerResult,
  },
  {
    id: 'sp_designer',
    label: 'UI 디자이너 4년차',
    hint: '커리어 폭을 넓히고 싶음',
    resumeText: 'UI 디자이너 4년차입니다. 컬러·타이포·컴포넌트 규칙을 문서화해 4개 팀에 배포했고, 메뉴 구조를 재편해 주요 기능 도달 단계를 4단계에서 2단계로 줄였습니다. 컴포넌트 스펙 문서를 만들어 개발 문의를 절반으로 줄였습니다.',
    cachedResult: designerResult,
  },
];
