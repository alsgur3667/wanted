import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { COMPANIES } from '@/lib/company-index';
import { requirementsOf } from '@/lib/skill-index';

afterEach(() => vi.unstubAllEnvs());

function validBody() {
  const req = requirementsOf('mobile_dev');
  return {
    companyId: COMPANIES[0].id,
    jobId: 'mobile_dev',
    level: '미들',
    employmentType: '정규직',
    workMode: 'hybrid',
    location: '서울 강남구',
    context: 'iOS 앱의 결제 흐름을 개선하고 배포 안정성을 높입니다.',
    mustSkillIds: req.must,
    niceSkillIds: req.nice,
  };
}

describe('POST /api/employer/posting-draft', () => {
  it('등록되지 않은 역량을 거부한다', async () => {
    const body = validBody();
    body.mustSkillIds = ['not-a-skill'];
    const response = await POST(new Request('http://localhost/api/employer/posting-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('mock 모드에서 수정 가능한 공고 초안을 결정론적으로 생성한다', async () => {
    vi.stubEnv('LLM_PROVIDER', 'mock');
    const request = () => new Request('http://localhost/api/employer/posting-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody()),
    });
    const first = await (await POST(request())).json();
    const second = await (await POST(request())).json();
    expect(first.ok).toBe(true);
    expect(first.provider).toBe('mock');
    expect(first.data.status).toBe('draft');
    expect(first.data.source).toBe('ai');
    expect(first.data).toEqual(second.data);
  });
});
