import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/analyze', () => {
  it('객체가 아닌 JSON 요청을 거부한다', async () => {
    const response = await POST(new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: 'null',
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('명시적인 mock 모드로 추출부터 추천까지 관통한다', async () => {
    vi.stubEnv('LLM_PROVIDER', 'mock');
    const resumeText = (
      'iOS 앱을 Swift로 개발했고 SQL로 사용자 지표를 분석했습니다. AWS에 배포하고 GitHub Actions로 테스트를 자동화했습니다. '
    ).repeat(2);
    const response = await POST(new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
      headers: { 'Content-Type': 'application/json' },
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.skills.length).toBeGreaterThan(0);
    expect(json.data.routes).toHaveLength(3);
  });
});
