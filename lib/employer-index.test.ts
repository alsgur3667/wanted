import { describe, expect, it } from 'vitest';
import {
  CANDIDATE_APPLICATIONS,
  EMPLOYER_CANDIDATES,
  JOB_POSTINGS,
  applicationsForPosting,
  employerCandidateById,
  matchEmployerCandidate,
  matchesForPosting,
  scoreEmployerCandidate,
  talentMatchesForDraft,
} from './employer-index';
import { createDraftBase } from '@/lib/posting-draft';
import { COMPANIES } from '@/lib/company-index';
import type { CandidateApplication, EmployerCandidate, JobPosting } from '@/types';


describe('기업용 가상 데이터', () => {
  it('72명과 288건의 참조가 유효하고 모든 공고에 6명이 지원한다', () => {
    expect(EMPLOYER_CANDIDATES).toHaveLength(72);
    expect(CANDIDATE_APPLICATIONS).toHaveLength(288);
    for (const posting of JOB_POSTINGS) {
      const applications = applicationsForPosting(posting.id);
      expect(applications).toHaveLength(6);
      expect(applications.every((row) => employerCandidateById(row.candidateId))).toBe(true);
    }
  });

  it('모든 공고에 다른 직무에서 온 후보가 포함된다', () => {
    for (const posting of JOB_POSTINGS) {
      expect(matchesForPosting(posting.id).some((match) => match.isDifferentRole)).toBe(true);
    }
  });

  it('점수는 0~100이고 높은 순으로 정렬된다', () => {
    for (const posting of JOB_POSTINGS) {
      const scores = matchesForPosting(posting.id).map((match) => match.fitScore);
      expect(scores.every((score) => score >= 0 && score <= 100)).toBe(true);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
      expect(scores[0]).toBeGreaterThanOrEqual(75);
      expect(new Set(scores).size).toBeGreaterThan(1);
    }
  });

  it('우대 역량이 없어도 필수를 전부 가지면 100점이다', () => {
    const basePosting = JOB_POSTINGS[0];
    const posting: JobPosting = { ...basePosting, niceSkillIds: [] };
    const baseCandidate = EMPLOYER_CANDIDATES[0];
    const candidate: EmployerCandidate = { ...baseCandidate, skillIds: [...posting.mustSkillIds] };
    const application: CandidateApplication = {
      ...CANDIDATE_APPLICATIONS[0],
      postingId: posting.id,
      candidateId: candidate.id,
    };
    expect(matchEmployerCandidate(posting, candidate, application).fitScore).toBe(100);
  });

  it('지원 이력 없이도 같은 기준으로 전체 인재풀을 평가한다', () => {
    const posting = JOB_POSTINGS[0];
    const candidate = EMPLOYER_CANDIDATES[0];
    const application = CANDIDATE_APPLICATIONS[0];
    expect(scoreEmployerCandidate(posting, candidate).fitScore)
      .toBe(matchEmployerCandidate(posting, candidate, application).fitScore);

    const draft = createDraftBase({
      companyId: COMPANIES[0].id,
      jobId: posting.jobId,
      level: posting.level,
      employmentType: posting.employmentType,
      workMode: posting.workMode,
      location: posting.location,
      mustSkillIds: posting.mustSkillIds,
      niceSkillIds: posting.niceSkillIds,
    }, COMPANIES[0], 'manual');
    const matches = talentMatchesForDraft(draft);
    expect(matches).toHaveLength(EMPLOYER_CANDIDATES.length);
    expect(matches[0].fitScore).toBeGreaterThanOrEqual(matches.at(-1)!.fitScore);
  });
});
