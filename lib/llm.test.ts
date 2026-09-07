import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeProvider, extractProfile, mockExtract } from './llm';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('mock 추출', () => {
  it('일반 문장 속 부분 문자열을 기술명으로 오인하지 않는다', () => {
    const result = mockExtract(
      'I managed a community and created presentations for weekly meetings while coordinating schedules and documenting decisions.'
    );
    const names = result.skillCandidates.map((s) => s.name);

    expect(names).not.toEqual(expect.arrayContaining(['TypeScript', 'RAG', 'Rust', 'Elasticsearch', 'Unity']));
  });

  it('3글자 기술명은 소문자 표기도 원문 근거와 함께 찾는다', () => {
    const result = mockExtract('ios 앱에서 sql을 사용하고 aws에 배포했습니다.');
    const names = result.skillCandidates.map((s) => s.name);

    expect(names).toEqual(expect.arrayContaining(['iOS', 'SQL', 'AWS']));
    expect(result.skillCandidates.every((s) => s.evidenceText.length > 0)).toBe(true);
  });

  it('명시한 외부 provider의 키가 없으면 시작 전에 실패한다', () => {
    vi.stubEnv('LLM_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', '');

    expect(() => activeProvider()).toThrow('GEMINI_API_KEY');
  });

  it('외부 provider 장애를 mock 결과로 바꾸지 않는다', async () => {
    vi.stubEnv('LLM_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(extractProfile('SQL을 사용했습니다.'.repeat(20))).rejects.toThrow('network down');
  });

  it('LLM이 만든 스킬 중 원문에서 근거를 확인할 수 있는 것만 남긴다', async () => {
    vi.stubEnv('LLM_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        currentPosition: { jobTitle: '분석가', jobFamily: '데이터', careerMonths: 12, industry: null, summary: '요약' },
        skillCandidates: [
          { name: 'SQL', evidenceText: 'SQL로 지표를 분석했습니다' },
          { name: 'Rust', evidenceText: 'Rust 서비스를 개발했습니다' },
        ],
      }) }] } }],
    }), { status: 200 })));

    const result = await extractProfile('SQL로 지표를 분석했습니다.');
    expect(result.data.skillCandidates.map((s) => s.name)).toEqual(['SQL']);
  });
});
