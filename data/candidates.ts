import type { Candidate } from '@/types';

// 샘플 지원자 풀 12명.
// ⚠️ 실제 인물이 아닌 가상 데이터이며, 화면에도 그렇게 표기한다.
//    실제 서비스에서는 지원자가 공개에 동의한 항목만 노출한다.
export const CANDIDATES: Candidate[] = [
  {
    id: 'c01', alias: '지원자 A', currentJobTitle: '프로덕트 매니저', jobFamily: '기획',
    careerMonths: 38, industry: 'IT/서비스',
    skills: ['요구사항 정의', '지표 설계', '사용자 인터뷰', 'A/B 테스트 설계', 'SQL'],
  },
  {
    id: 'c02', alias: '지원자 B', currentJobTitle: '그로스 마케터', jobFamily: '마케팅',
    careerMonths: 62, industry: 'IT/커머스',
    skills: ['A/B 테스트 설계', '사용자 인터뷰', 'SQL', '지표 설계', '데이터 해석'],
  },
  {
    id: 'c03', alias: '지원자 C', currentJobTitle: 'IT QA 엔지니어', jobFamily: '개발',
    careerMonths: 41, industry: 'IT/서비스',
    skills: ['요구사항 정의', '우선순위 관리', '지표 설계', 'TypeScript', '데이터 해석'],
  },
  {
    id: 'c04', alias: '지원자 D', currentJobTitle: '서비스 기획자', jobFamily: '기획',
    careerMonths: 74, industry: '금융',
    skills: ['요구사항 정의', '정보 구조 설계', '우선순위 관리', '프로토타이핑', '사용자 인터뷰'],
  },
  {
    id: 'c05', alias: '지원자 E', currentJobTitle: '프론트엔드 개발자', jobFamily: '개발',
    careerMonths: 50, industry: 'IT/서비스',
    skills: ['React', 'TypeScript', '컴포넌트 설계', '웹 성능 최적화', '접근성(A11y)'],
  },
  {
    id: 'c06', alias: '지원자 F', currentJobTitle: 'UI 디자이너', jobFamily: '디자인',
    careerMonths: 50, industry: 'IT/서비스',
    skills: ['컴포넌트 설계', '디자인 시스템', '시각 위계 설계', '프로토타이핑', '정보 구조 설계'],
  },
  {
    id: 'c07', alias: '지원자 G', currentJobTitle: '백엔드 개발자', jobFamily: '개발',
    careerMonths: 66, industry: 'IT/서비스',
    skills: ['TypeScript', 'SQL', '웹 성능 최적화', '컴포넌트 설계'],
  },
  {
    id: 'c08', alias: '지원자 H', currentJobTitle: '프로덕트 디자이너', jobFamily: '디자인',
    careerMonths: 40, industry: 'IT/커머스',
    skills: ['정보 구조 설계', '프로토타이핑', '사용성 테스트', '시각 위계 설계', '사용자 인터뷰'],
  },
  {
    id: 'c09', alias: '지원자 I', currentJobTitle: '데이터 분석가', jobFamily: '기획',
    careerMonths: 46, industry: 'IT/커머스',
    skills: ['SQL', '데이터 해석', '지표 설계', 'A/B 테스트 설계'],
  },
  {
    id: 'c10', alias: '지원자 J', currentJobTitle: '모션 디자이너', jobFamily: '디자인',
    careerMonths: 34, industry: '광고',
    skills: ['인터랙션 구현', '시각 위계 설계', '프로토타이핑', '컴포넌트 설계'],
  },
  {
    id: 'c11', alias: '지원자 K', currentJobTitle: '웹 퍼블리셔', jobFamily: '디자인',
    careerMonths: 78, industry: 'IT/서비스',
    skills: ['컴포넌트 설계', '접근성(A11y)', 'TypeScript', '디자인 시스템', '시각 위계 설계'],
  },
  {
    id: 'c12', alias: '지원자 L', currentJobTitle: '비즈니스 애널리스트', jobFamily: '기획',
    careerMonths: 55, industry: '금융',
    skills: ['요구사항 정의', '데이터 해석', 'SQL', '우선순위 관리'],
  },
];
