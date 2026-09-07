import { describe, expect, it } from 'vitest';
import { mockExtract } from './llm';
import { buildAnalysis } from './scoring';

const CLEAR_PROFILES = [
  {
    label: '모바일 개발자',
    expected: '모바일 개발자',
    text: '8년차 모바일 개발자입니다. Swift와 Objective-C로 iOS 앱을 개발했고 Kotlin과 Android 협업도 했습니다. Xcode, Git, Jenkins를 사용했습니다.',
  },
  {
    label: '프론트엔드 개발자',
    expected: '프론트엔드 개발자',
    text: '5년차 프론트엔드 개발자입니다. TypeScript, React, Next.js, HTML, CSS로 웹 서비스를 개발했고 Redux와 webpack을 사용했습니다.',
  },
  {
    label: '백엔드 개발자',
    expected: '백엔드 개발자',
    text: '6년차 백엔드 개발자입니다. Java와 Spring Boot로 REST API를 개발했고 SQL, Redis, Kafka, Docker를 운영했습니다.',
  },
  {
    label: '풀스택 개발자',
    expected: '풀스택 개발자',
    text: '5년차 풀스택 개발자입니다. React와 TypeScript로 화면을, Node.js와 NestJS로 API를 개발했습니다. PostgreSQL, Docker, AWS 배포까지 담당했습니다.',
  },
  {
    label: '데이터 엔지니어',
    expected: '데이터 엔지니어',
    text: '6년차 데이터 엔지니어입니다. Python과 SQL로 ETL 파이프라인을 구축했고 Airflow, Apache Spark, Kafka, Snowflake를 운영했습니다.',
  },
  {
    label: '데이터 사이언티스트',
    expected: '데이터 사이언티스트',
    text: '5년차 데이터 사이언티스트입니다. Python, PyTorch, TensorFlow로 머신러닝과 NLP 모델을 개발했고 GPU와 MLflow를 사용했습니다.',
  },
  {
    label: '데이터 분석가',
    expected: '데이터 분석가',
    text: '4년차 데이터 분석가입니다. SQL과 Python으로 데이터 분석을 수행하고 Tableau와 Power BI로 데이터 시각화와 지표 설계를 담당했습니다.',
  },
  {
    label: 'DevOps·SRE',
    expected: 'DevOps·SRE',
    text: '7년차 DevOps SRE입니다. AWS, Docker, Kubernetes, Terraform으로 인프라를 구축하고 Jenkins, Prometheus, Grafana로 CI/CD와 모니터링을 운영했습니다.',
  },
  {
    label: '보안 엔지니어',
    expected: '보안 엔지니어',
    text: '6년차 보안 엔지니어입니다. OWASP 기반 취약점 진단과 DevSecOps를 담당했고 SIEM, RBAC, ISMS-P, CISSP 역량을 갖췄습니다.',
  },
  {
    label: 'QA 엔지니어',
    expected: 'QA 엔지니어',
    text: '5년차 QA 엔지니어입니다. Selenium, Playwright, Cypress로 E2E 자동화 테스트를 구축했고 Jenkins와 Jira로 품질 프로세스를 운영했습니다.',
  },
  {
    label: '프로덕트 매니저',
    expected: '프로덕트 매니저',
    text: '7년차 프로덕트 매니저입니다. 요구사항 정의, 지표 설계, 우선순위 관리, 사용자 인터뷰, A/B 테스트 설계, 퍼널 분석과 이해관계자 조율을 담당했습니다.',
  },
  {
    label: '프로덕트 디자이너',
    expected: '프로덕트 디자이너',
    text: '6년차 프로덕트 디자이너입니다. Figma와 UX/UI를 기반으로 제품 디자인, 프로토타이핑, 인터랙션 구현, 디자인 시스템과 개발 핸드오프를 담당했습니다.',
  },
] as const;

describe('명확한 직무 합성 이력서 벤치마크', () => {
  it.each(CLEAR_PROFILES)('$label는 기대 직무를 1위로 추천한다', ({ expected, text }) => {
    const result = buildAnalysis(mockExtract(text));

    expect(result.routes).toHaveLength(3);
    expect(result.routes[0].destination).toBe(expected);
    expect(result.routes[0].fitScore).toBeGreaterThanOrEqual(65);
  });

  it('낮은 점수의 대안 경로를 강한 추천처럼 설명하지 않는다', () => {
    const result = buildAnalysis(mockExtract(CLEAR_PROFILES[0].text));
    const weak = result.routes.find((route) => route.fitScore < 30);

    expect(weak).toBeDefined();
    expect(weak?.reason).toContain('근거가 약한 후보');
  });
});
