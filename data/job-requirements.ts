import type { JobRequirement } from '@/types';

// 채용 공고의 요구 역량. 실제 서비스에서는 JD 텍스트에서 LLM이 추출한다.
export const JOB_REQUIREMENTS: JobRequirement[] = [
  {
    id: 'jr_pm',
    title: '프로덕트 매니저',
    jobFamily: '기획',
    mustSkills: ['요구사항 정의', '지표 설계', '사용자 인터뷰', '우선순위 관리'],
    niceSkills: ['A/B 테스트 설계', 'SQL', '로드맵 관리'],
  },
  {
    id: 'jr_fe',
    title: '프론트엔드 개발자',
    jobFamily: '개발',
    mustSkills: ['React', 'TypeScript', '컴포넌트 설계', '웹 성능 최적화'],
    niceSkills: ['접근성(A11y)', '인터랙션 구현', '디자인 시스템'],
  },
  {
    id: 'jr_pd',
    title: '프로덕트 디자이너',
    jobFamily: '디자인',
    mustSkills: ['정보 구조 설계', '프로토타이핑', '사용성 테스트', '시각 위계 설계'],
    niceSkills: ['디자인 시스템', '사용자 인터뷰', '데이터 해석'],
  },
];
