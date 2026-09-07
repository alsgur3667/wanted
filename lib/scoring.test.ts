import { describe, expect, it } from 'vitest';
import { mockExtract } from './llm';
import { buildAnalysis, normalizeJobFamily } from './scoring';

describe('직군 정규화', () => {
  it.each([
    ['Software Engineering', '개발'],
    ['데이터 엔지니어링', '개발'],
    ['Product Management', '기획'],
    ['UX Design', '디자인'],
  ])('%s를 %s로 정규화한다', (raw, expected) => {
    expect(normalizeJobFamily(raw)).toBe(expected);
  });
});

describe('iOS 경력자 회귀', () => {
  it('표본 신뢰도 때문에 사용자 적합도 자체를 50점대로 낮추지 않는다', () => {
    const text = 'Language swift, objective-c, java, JavaScript, C#, C++, Python Platform IOS, Android, Web(HTML, CSS, JS), Linux System Mac OS, Windows Tool XCode, Git, Redmine, Jira, Notion, Slack, Jenkins, Zeplin 8년차 iOS개발자, 총 경력 9년, iOS만 7년, iOS/AOS병행 1년, 기타 1년';
    const result = buildAnalysis(mockExtract(text));
    const mobile = result.routes.find((route) => route.destination === '모바일 개발자');

    expect(result.currentPosition.careerMonths).toBe(108);
    expect(result.routes[0].destination).toBe('모바일 개발자');
    expect(mobile?.fitScore).toBeGreaterThanOrEqual(70);
    expect(mobile?.reason).toContain('가중 65%');
  });
});

describe('표시 적합도와 추천 순위 일관성', () => {
  it('서비스 기획자의 높은 프로덕트 매니저 적합도를 직무 보정으로 뒤집지 않는다', () => {
    const text = '7년차 서비스 기획자입니다. SQL로 지표를 분석하고 요구사항 정의, 지표 설계, 우선순위 관리, 사용자 인터뷰, A/B 테스트 설계, 퍼널 분석, 이해관계자 조율을 담당했습니다.';
    const result = buildAnalysis(mockExtract(text));

    expect(result.routes[0].destination).toBe('프로덕트 매니저');
    expect(result.routes[0].fitScore).toBeGreaterThan(result.routes[1].fitScore);
  });

  it('모든 추천 경로를 사용자에게 표시하는 적합도 내림차순으로 반환한다', () => {
    const text = '5년차 데이터 분석가입니다. SQL과 Python으로 데이터 분석을 수행했고 BI, Tableau, Looker, 지표 설계, A/B 테스트 설계, 퍼널 분석 경험이 있습니다.';
    const result = buildAnalysis(mockExtract(text));
    const scores = result.routes.map((route) => route.fitScore);

    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(result.routes.some((route) => route.destination === '데이터 분석가')).toBe(true);
  });
});
