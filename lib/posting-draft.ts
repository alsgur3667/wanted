import { COMPANIES } from '@/lib/company-index';
import { JOBS, SKILLS, getJob, requirementsOf } from '@/lib/skill-index';
import type {
  Company,
  PostingDraft,
  PostingDraftRequest,
  PostingLevel,
} from '@/types';

const COMPANY_IDS = new Set(COMPANIES.map((company) => company.id));
const JOB_IDS = new Set(JOBS.map((job) => job.id));
const SKILL_IDS = new Set(SKILLS.map((skill) => skill.id));
const LEVELS: PostingLevel[] = ['신입', '주니어', '미들', '시니어', '리드'];
const EMPLOYMENT_TYPES = ['정규직', '계약직'] as const;
const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const;

const CAREER_RANGE: Record<PostingLevel, [number, number | null]> = {
  신입: [0, 12],
  주니어: [12, 48],
  미들: [36, 84],
  시니어: [60, 144],
  리드: [84, null],
};

const SENSITIVE_PATTERNS = [
  /\b(남성|여성|남자|여자)\s*(만|우대|선호)/,
  /(만\s*\d{1,2}세|\d{1,2}세\s*(이하|미만|이상))/,
  /(미혼|기혼|결혼\s*여부|출산\s*계획)/,
  /(용모|외모)\s*(단정|우수)/,
  /(특정\s*)?(출신\s*)?(지역|학교)\s*(우대|제한)/,
];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function validatePostingDraftRequest(value: unknown) {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false as const, errors: ['요청 형식이 올바르지 않습니다.'] };
  }
  const input = value as Record<string, unknown>;
  if (typeof input.companyId !== 'string' || !COMPANY_IDS.has(input.companyId)) errors.push('회사를 다시 선택해 주세요.');
  if (typeof input.jobId !== 'string' || !JOB_IDS.has(input.jobId)) errors.push('직무를 다시 선택해 주세요.');
  if (typeof input.level !== 'string' || !LEVELS.includes(input.level as PostingLevel)) errors.push('경력 수준이 올바르지 않습니다.');
  if (!EMPLOYMENT_TYPES.includes(input.employmentType as typeof EMPLOYMENT_TYPES[number])) errors.push('고용 형태가 올바르지 않습니다.');
  if (!WORK_MODES.includes(input.workMode as typeof WORK_MODES[number])) errors.push('근무 방식이 올바르지 않습니다.');
  if (typeof input.location !== 'string' || input.location.trim().length < 2 || input.location.length > 80) errors.push('근무 지역은 2~80자로 입력해 주세요.');
  if (typeof input.context !== 'string' || input.context.trim().length < 10 || input.context.length > 1200) errors.push('담당 업무나 해결할 문제를 10~1,200자로 입력해 주세요.');
  if (!isStringArray(input.mustSkillIds) || input.mustSkillIds.length < 1 || input.mustSkillIds.length > 10) errors.push('필수 역량은 1~10개를 선택해 주세요.');
  if (!isStringArray(input.niceSkillIds) || input.niceSkillIds.length > 10) errors.push('우대 역량은 10개 이하로 선택해 주세요.');
  if (isStringArray(input.mustSkillIds) && input.mustSkillIds.some((id) => !SKILL_IDS.has(id))) errors.push('등록되지 않은 필수 역량이 포함되어 있습니다.');
  if (isStringArray(input.niceSkillIds) && input.niceSkillIds.some((id) => !SKILL_IDS.has(id))) errors.push('등록되지 않은 우대 역량이 포함되어 있습니다.');
  if (isStringArray(input.mustSkillIds) && isStringArray(input.niceSkillIds)) {
    const must = new Set(input.mustSkillIds);
    if (input.niceSkillIds.some((id) => must.has(id))) errors.push('필수와 우대 역량에 같은 항목을 중복 선택할 수 없습니다.');
  }
  if (errors.length) return { ok: false as const, errors };
  return { ok: true as const, data: input as unknown as PostingDraftRequest };
}

export function postingContentWarnings(text: string) {
  const warnings: string[] = [];
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(text))) {
    warnings.push('성별·나이·혼인 여부·외모·출신과 관련된 차별 소지가 있는 표현을 확인해 주세요.');
  }
  if (/(업계\s*최고|무조건|100%|평생\s*보장)/.test(text)) {
    warnings.push('검증하기 어려운 보장성 표현이 포함되어 있습니다.');
  }
  return warnings;
}

export function validatePostingDraft(draft: PostingDraft) {
  const errors: string[] = [];
  if (!COMPANY_IDS.has(draft.companyId)) errors.push('회사 참조가 올바르지 않습니다.');
  if (!JOB_IDS.has(draft.jobId)) errors.push('직무 참조가 올바르지 않습니다.');
  if (draft.title.trim().length < 2 || draft.title.length > 80) errors.push('공고 제목은 2~80자로 입력해 주세요.');
  if (draft.summary.trim().length < 20 || draft.summary.length > 500) errors.push('공고 소개는 20~500자로 입력해 주세요.');
  if (draft.responsibilities.length < 2 || draft.responsibilities.length > 8 || draft.responsibilities.some((row) => row.trim().length < 5 || row.length > 160)) errors.push('주요 업무는 각 5~160자로 2~8개 입력해 주세요.');
  if (!draft.mustSkillIds.length || draft.mustSkillIds.length > 10) errors.push('필수 역량은 1~10개가 필요합니다.');
  if ([...draft.mustSkillIds, ...draft.niceSkillIds].some((id) => !SKILL_IDS.has(id))) errors.push('등록되지 않은 역량이 포함되어 있습니다.');
  if (draft.niceSkillIds.some((id) => draft.mustSkillIds.includes(id))) errors.push('필수와 우대 역량이 중복되었습니다.');
  const warnings = postingContentWarnings([draft.title, draft.summary, ...draft.responsibilities].join(' '));
  return { ok: errors.length === 0, errors, warnings };
}

export function recommendedSkills(jobId: string) {
  return requirementsOf(jobId);
}

export function createDraftBase(
  input: Omit<PostingDraftRequest, 'context'>,
  company: Company,
  source: PostingDraft['source'],
): PostingDraft {
  const job = getJob(input.jobId);
  if (!job) throw new Error('등록되지 않은 직무입니다.');
  const [minCareerMonths, maxCareerMonths] = CAREER_RANGE[input.level];
  return {
    companyId: input.companyId,
    jobId: input.jobId,
    title: `${input.level === '미들' ? '' : `${input.level} `}${job.title}`.trim(),
    jobFamily: job.family,
    level: input.level,
    minCareerMonths,
    maxCareerMonths,
    employmentType: input.employmentType,
    workMode: input.workMode,
    location: input.location.trim(),
    summary: `${company.productDescription}의 다음 과제를 함께 해결할 ${job.title}를 찾습니다.`,
    responsibilities: [
      '담당 영역의 문제를 정의하고 실행 가능한 해결책을 만듭니다.',
      '관련 팀과 기준을 맞추고 결과를 지속적으로 개선합니다.',
    ],
    mustSkillIds: [...new Set(input.mustSkillIds)],
    niceSkillIds: [...new Set(input.niceSkillIds)].filter((id) => !input.mustSkillIds.includes(id)),
    benefits: company.benefits.slice(0, 4),
    hiringProcess: company.hiringProcess,
    applicationDocuments: job.family === '디자인' ? ['이력서', '포트폴리오'] : ['이력서'],
    salary: { display: '회사 내규에 따름', currency: 'KRW', unit: '만원' },
    status: 'draft',
    source,
    isSynthetic: true,
  };
}
