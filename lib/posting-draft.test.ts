import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/lib/company-index';
import {
  createDraftBase,
  postingContentWarnings,
  recommendedSkills,
  validatePostingDraft,
  validatePostingDraftRequest,
} from '@/lib/posting-draft';

describe('공고 초안 계약', () => {
  it('직무별 기본 역량을 사용해 유효한 직접 작성 초안을 만든다', () => {
    const skills = recommendedSkills('data_analyst');
    const draft = createDraftBase({
      companyId: COMPANIES[0].id,
      jobId: 'data_analyst',
      level: '주니어',
      employmentType: '정규직',
      workMode: 'hybrid',
      location: '서울 강남구',
      mustSkillIds: skills.must,
      niceSkillIds: skills.nice,
    }, COMPANIES[0], 'manual');
    expect(validatePostingDraft(draft).ok).toBe(true);
    expect(draft.status).toBe('draft');
    expect(draft.source).toBe('manual');
  });

  it('필수와 우대의 중복 및 알 수 없는 역량을 거부한다', () => {
    const result = validatePostingDraftRequest({
      companyId: COMPANIES[0].id,
      jobId: 'data_analyst',
      level: '미들',
      employmentType: '정규직',
      workMode: 'hybrid',
      location: '서울',
      context: '데이터 지표를 정리하고 의사결정을 지원합니다.',
      mustSkillIds: ['sql', 'unknown'],
      niceSkillIds: ['sql'],
    });
    expect(result.ok).toBe(false);
  });

  it('차별 및 검증하기 어려운 표현을 경고한다', () => {
    expect(postingContentWarnings('30세 이하 남성만 지원, 업계 최고 대우를 보장합니다.')).toHaveLength(2);
  });
});
