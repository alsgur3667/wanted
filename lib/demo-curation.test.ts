import { describe, expect, it } from 'vitest';
import { mockExtract } from './llm';
import { buildAnalysis } from './scoring';
import { findMentions, getSkill, requirementsOf } from './skill-index';

describe('디자인 직무 목업 데이터', () => {
  it('프로덕트 디자이너 역할 표기를 제품 디자인 역량으로 인식한다', () => {
    const names = findMentions('6년차 프로덕트 디자이너입니다.')
      .map((mention) => mention.name);

    expect(names).toContain('제품 디자인');
  });

  it('프로덕트 디자이너의 플랫폼 경험을 모바일 개발 경력으로 오해하지 않는다', () => {
    const text = '6년차 프로덕트 디자이너입니다. UX/UI, Figma, HCI, iOS, JSON을 활용해 제품 경험을 설계했습니다.';
    const result = buildAnalysis(mockExtract(text));

    expect(result.routes[0].destination).toBe('프로덕트 디자이너');
    expect(result.routes[0].fitScore).toBeGreaterThan(
      result.routes.find((route) => route.destination === '모바일 개발자')?.fitScore ?? 0
    );
  });

  it('프로덕트 디자이너 요구 역량에서 근거 없는 개발 도구를 제외한다', () => {
    const requirements = requirementsOf('product_designer');
    const names = [...requirements.must, ...requirements.nice]
      .map((id) => getSkill(id)?.name);

    expect(names).toContain('제품 디자인');
    expect(names).not.toContain('MongoDB');
    expect(names).not.toContain('JUnit');
    expect(names).not.toContain('Node.js');
  });

  it('데이터·비즈니스 기획을 BI 도구만으로 판정하지 않는다', () => {
    const requirements = requirementsOf('biz_analyst');
    const must = requirements.must.map((id) => getSkill(id)?.name);

    expect(must).toContain('요구사항 정의');
    expect(must).toContain('이해관계자 조율');
  });
});
