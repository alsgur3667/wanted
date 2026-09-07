import { describe, expect, it } from 'vitest';
import type { Candidate, JobRequirement } from '@/types';
import { buildEmployerResult, isSameRoleTitle } from './matching';

const requirement: JobRequirement = {
  id: 'jr_fe',
  title: '프론트엔드 개발자',
  jobFamily: '개발',
  mustSkills: ['React'],
  niceSkills: [],
};

const candidates: Candidate[] = [
  { id: 'same', alias: '같은 직무', currentJobTitle: '프론트엔드 개발자', jobFamily: '개발', careerMonths: 24, industry: null, skills: ['React'] },
  { id: 'other', alias: '다른 직무', currentJobTitle: 'QA 엔지니어', jobFamily: '개발', careerMonths: 24, industry: null, skills: ['React'] },
];

describe('채용 직무명 필터', () => {
  it('같은 직군이어도 직무명이 다르면 직무명 검색 결과에서 제외한다', () => {
    expect(isSameRoleTitle(requirement, candidates[1])).toBe(false);
    const result = buildEmployerResult(requirement, candidates, { includeDifferentRole: false });
    expect(result.matches.map((m) => m.candidate.id)).toEqual(['same']);
  });
});
