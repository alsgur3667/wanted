import candidatesRaw from '@/data/demo-employer-candidates.json';
import applicationsRaw from '@/data/demo-candidate-applications.json';
import {
  COMPANIES,
  JOB_POSTINGS,
  companyById,
  postingById,
  postingsForCompany,
} from '@/lib/company-index';
import { coverage, getSkill, satisfied } from '@/lib/skill-index';
import type {
  ApplicationStage,
  CandidateApplication,
  EmployerCandidate,
  EmployerCandidateMatch,
  JobPosting,
  PostingDraft,
  TalentCandidateMatch,
} from '@/types';


export const EMPLOYER_CANDIDATES = candidatesRaw as EmployerCandidate[];
export const CANDIDATE_APPLICATIONS = applicationsRaw as CandidateApplication[];

const candidateMap = new Map(EMPLOYER_CANDIDATES.map((candidate) => [candidate.id, candidate]));
const applicationsByPosting = new Map<string, CandidateApplication[]>();
for (const application of CANDIDATE_APPLICATIONS) {
  const rows = applicationsByPosting.get(application.postingId) ?? [];
  rows.push(application);
  applicationsByPosting.set(application.postingId, rows);
}

export const employerCandidateById = (id: string) => candidateMap.get(id);
export const applicationsForPosting = (postingId: string) => applicationsByPosting.get(postingId) ?? [];

function estimateOnboarding(skillIds: string[]) {
  if (!skillIds.length) return 0;
  const difficulty = skillIds.reduce((sum, id) => sum + (getSkill(id)?.learnDifficulty ?? 0.5), 0);
  return Math.max(1, Math.round(difficulty * 3));
}

type PostingCriteria = Pick<JobPosting | PostingDraft,
  'jobId' | 'mustSkillIds' | 'niceSkillIds' | 'minCareerMonths' | 'maxCareerMonths'>;

/** 지원 여부와 무관한 순수 역량 평가. 새 공고의 인재풀 추천에도 같은 점수식을 쓴다. */
export function scoreEmployerCandidate(
  posting: PostingCriteria,
  candidate: EmployerCandidate,
): TalentCandidateMatch {
  const have = new Set(candidate.skillIds);
  const must = satisfied(posting.mustSkillIds, have);
  const nice = satisfied(posting.niceSkillIds, have);
  const mustCoverage = coverage(posting.jobId, posting.mustSkillIds, have);
  const niceCoverage = posting.niceSkillIds.length
    ? coverage(posting.jobId, posting.niceSkillIds, have)
    : 0;
  const niceWeight = posting.niceSkillIds.length ? 1 : 0;
  const fitScore = Math.round(100 * (mustCoverage * 3 + niceCoverage * niceWeight) / (3 + niceWeight));
  const covered = new Set(must.covered);
  const gapSkillIds = posting.mustSkillIds.filter((id) => !covered.has(id));
  const maxCareer = posting.maxCareerMonths;

  return {
    candidate,
    fitScore,
    mustCoverage,
    niceCoverage,
    matchedSkillIds: [...new Set([...must.hit, ...nice.hit])],
    coveredViaSkillIds: [...must.covered, ...nice.covered].filter((id) => !have.has(id)),
    gapSkillIds,
    onboardingMonths: estimateOnboarding(gapSkillIds),
    careerFit: candidate.careerMonths >= posting.minCareerMonths
      && (maxCareer === null || candidate.careerMonths <= maxCareer),
    isDifferentRole: candidate.currentJobId !== posting.jobId,
  };
}

export function matchEmployerCandidate(
  posting: JobPosting,
  candidate: EmployerCandidate,
  application: CandidateApplication,
): EmployerCandidateMatch {
  return { ...scoreEmployerCandidate(posting, candidate), application };
}

export function talentMatchesForDraft(draft: PostingDraft) {
  return EMPLOYER_CANDIDATES
    .map((candidate) => scoreEmployerCandidate(draft, candidate))
    .sort((a, b) => b.fitScore - a.fitScore || Number(b.careerFit) - Number(a.careerFit));
}

export function matchesForPosting(postingId: string) {
  const posting = postingById(postingId);
  if (!posting) return [];
  return applicationsForPosting(postingId)
    .map((application) => {
      const candidate = employerCandidateById(application.candidateId);
      return candidate ? matchEmployerCandidate(posting, candidate, application) : null;
    })
    .filter((match): match is EmployerCandidateMatch => match !== null)
    .sort((a, b) => b.fitScore - a.fitScore || Number(b.careerFit) - Number(a.careerFit));
}

export function employerOverview() {
  return COMPANIES.map((company) => ({
    company,
    postings: postingsForCompany(company.id),
    applications: postingsForCompany(company.id)
      .reduce((sum, posting) => sum + applicationsForPosting(posting.id).length, 0),
  }));
}

export const APPLICATION_STAGE_LABEL: Record<ApplicationStage, string> = {
  new: '신규',
  screening: '검토 중',
  interview: '인터뷰',
  offer: '처우 협의',
  hold: '보류',
  rejected: '불합격',
};

export const APPLICATION_STAGES = Object.keys(APPLICATION_STAGE_LABEL) as ApplicationStage[];

export {
  COMPANIES,
  JOB_POSTINGS,
  companyById,
  postingById,
  postingsForCompany,
};
