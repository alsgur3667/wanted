import { describe, expect, it } from 'vitest';
import { findMentions } from './skill-index';

describe('이력서 기술명 경계 인식', () => {
  it.each([
    ['Python으로 데이터를 분석했습니다.', 'Python'],
    ['SQL로 지표를 만들었습니다.', 'SQL'],
    ['TensorFlow를 사용했습니다.', 'TensorFlow'],
  ])('%s에서 %s을 찾는다', (text, expected) => {
    expect(findMentions(text).map((mention) => mention.name)).toContain(expected);
  });

  it('긴 기술명 안의 짧은 기술을 별도 기술로 오인하지 않는다', () => {
    const names = findMentions('JavaScript로 웹을 개발했습니다.').map((mention) => mention.name);

    expect(names).toContain('JavaScript');
    expect(names).not.toContain('Java');
  });
});
