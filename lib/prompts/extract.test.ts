import { describe, expect, it } from 'vitest';
import { buildExtractUserPrompt, buildMentionSection } from './extract';

describe('추출 프롬프트', () => {
  it('코드가 찾은 후보 문맥을 실제 사용자 프롬프트에 포함한다', () => {
    const mentions = buildMentionSection([
      { name: 'SQL', matched: 'sql', context: 'sql로 지표를 분석했습니다' },
    ]);
    const prompt = buildExtractUserPrompt('sql로 지표를 분석했습니다', undefined, '', mentions);

    expect(prompt).toContain('기계가 찾아낸 후보');
    expect(prompt).toContain('sql로 지표를 분석했습니다');
  });
});
