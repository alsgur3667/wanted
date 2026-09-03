// 부족 역량 설명용 메타. 학습 난이도(0~1)와 '오늘 할 수 있는 첫 단계'.
// 실제 서비스에서는 온톨로지(KNOW/NCS)에서 파생시킨다.
export const SKILL_META: Record<string, { difficulty: number; firstStep: string }> = {
  '요구사항 정의':   { difficulty: 0.45, firstStep: '담당 기능 하나를 화면 없이 글로만 설명하는 문서로 써 보세요.' },
  '지표 설계':       { difficulty: 0.6,  firstStep: '맡은 화면의 성공 지표를 하나 정하고 측정 방법을 문서로 남겨 보세요.' },
  '사용자 인터뷰':   { difficulty: 0.5,  firstStep: '실제 사용자 3명에게 화면을 보여주고 막히는 지점을 기록해 보세요.' },
  '우선순위 관리':   { difficulty: 0.5,  firstStep: '팀 백로그를 임팩트·공수 2축으로 정렬해 공유해 보세요.' },
  'A/B 테스트 설계': { difficulty: 0.55, firstStep: '가설 하나를 정하고 표본 크기까지 계산한 실험안을 써 보세요.' },
  'SQL':             { difficulty: 0.5,  firstStep: '주간 리포트에 쓰는 숫자 하나를 직접 쿼리로 뽑아 보세요.' },
  '기술 커뮤니케이션':{ difficulty: 0.55, firstStep: '다음 스펙 문서에 API 흐름도를 그려 넣고 개발자 리뷰를 받아 보세요.' },
  'React':           { difficulty: 0.6,  firstStep: '만든 컴포넌트 하나를 실제 코드로 구현해 Storybook에 올려 보세요.' },
  'TypeScript':      { difficulty: 0.5,  firstStep: '기존 JS 파일 하나를 타입 정의부터 붙여 옮겨 보세요.' },
  '컴포넌트 설계':   { difficulty: 0.5,  firstStep: '반복되는 UI 3개를 찾아 공통 컴포넌트로 묶어 보세요.' },
  '웹 성능 최적화':  { difficulty: 0.65, firstStep: 'Lighthouse로 담당 페이지를 측정하고 가장 큰 병목 하나를 적어 보세요.' },
  '접근성(A11y)':    { difficulty: 0.45, firstStep: '담당 화면을 키보드만으로 끝까지 조작해 보고 막히는 곳을 기록하세요.' },
  '인터랙션 구현':   { difficulty: 0.5,  firstStep: '기존 화면의 전환 하나에 애니메이션을 직접 붙여 보세요.' },
  '디자인 시스템':   { difficulty: 0.5,  firstStep: '자주 쓰는 컬러·간격 값을 토큰으로 정리해 문서화해 보세요.' },
  '정보 구조 설계':  { difficulty: 0.5,  firstStep: '담당 서비스의 메뉴 구조를 트리로 그려 중복을 찾아 보세요.' },
  '프로토타이핑':    { difficulty: 0.4,  firstStep: '다음 과제를 개발 전에 클릭 가능한 프로토타입으로 먼저 만들어 보세요.' },
  '사용성 테스트':   { difficulty: 0.5,  firstStep: '과업 3개를 정하고 동료에게 시켜 성공률을 기록해 보세요.' },
  '시각 위계 설계':  { difficulty: 0.55, firstStep: '최근 만든 화면을 여백·크기·대비만으로 다시 정리해 보세요.' },
  '데이터 해석':     { difficulty: 0.5,  firstStep: '담당 화면의 지표 변화를 주 단위로 읽고 원인 가설을 적어 보세요.' },
  '로드맵 관리':     { difficulty: 0.55, firstStep: '분기 과제를 목표-지표-일정 3열 표로 정리해 보세요.' },
};

export const DEFAULT_META = { difficulty: 0.5, firstStep: '관련 업무를 작은 단위로 한 번 직접 수행해 보세요.' };
