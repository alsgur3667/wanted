import companiesRaw from '@/data/demo-companies.json';
import postingsRaw from '@/data/demo-job-postings.json';
import { getSkill } from '@/lib/skill-index';
import type { Company, CompanyStage, JobPosting, WorkMode } from '@/types';


export const COMPANIES = companiesRaw as Company[];
export const JOB_POSTINGS = postingsRaw as JobPosting[];

const companyByIdMap = new Map(COMPANIES.map((company) => [company.id, company]));
const postingByIdMap = new Map(JOB_POSTINGS.map((posting) => [posting.id, posting]));

export const companyById = (id: string) => companyByIdMap.get(id);
export const postingById = (id: string) => postingByIdMap.get(id);

export function postingsForCompany(companyId: string) {
  return JOB_POSTINGS.filter((posting) => posting.companyId === companyId);
}

export function postingsForJob(jobId: string, limit?: number) {
  const rows = JOB_POSTINGS.filter((posting) => posting.jobId === jobId)
    .map((posting) => ({ posting, company: companyById(posting.companyId)! }))
    .filter((row) => row.company);
  return limit === undefined ? rows : rows.slice(0, limit);
}

export function searchCompanies(query: string) {
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  if (!normalized) return COMPANIES;
  return COMPANIES.filter((company) =>
    [company.name, company.industry, company.tagline, ...company.tags]
      .join(' ')
      .toLocaleLowerCase('ko-KR')
      .includes(normalized)
  );
}

export function skillNames(ids: string[]) {
  return ids.map((id) => getSkill(id)?.name ?? id);
}

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  onsite: '오피스 근무',
  hybrid: '하이브리드',
  remote: '원격 근무',
};

export const STAGE_LABEL: Record<CompanyStage, string> = {
  early: '초기 단계',
  growth: '성장 단계',
  stable: '안정 단계',
  enterprise: '대규모 조직',
};

export function careerLabel(posting: JobPosting) {
  if (posting.minCareerMonths === 0 && posting.maxCareerMonths !== null && posting.maxCareerMonths <= 12) return '신입';
  const min = Math.floor(posting.minCareerMonths / 12);
  if (posting.maxCareerMonths === null) return `경력 ${min}년 이상`;
  const max = Math.floor(posting.maxCareerMonths / 12);
  return min === 0 ? `신입~${max}년` : `경력 ${min}~${max}년`;
}

export function deadlineLabel(posting: JobPosting) {
  if (posting.deadlineType === 'rolling' || !posting.deadline) return '상시채용';
  const [, month, day] = posting.deadline.split('-');
  return `${Number(month)}월 ${Number(day)}일 마감`;
}
