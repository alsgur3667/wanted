// ============================================================================
//  커리어 내비 (Career Navi) — 팀 계약서 (Contract)
//
//  A(파이프라인 축) ↔ B(표현 축) 사이의 유일한 인터페이스.
//  A는 이 타입을 "뱉는" 책임, B는 이 타입을 "그리는" 책임만 진다.
//
//  ⚠️ 이 파일은 두 사람 합의 없이 수정 금지.
//     여기가 흔들리면 Week 3 통합에서 프로젝트가 터진다.
// ============================================================================

// ----------------------------------------------------------------------------
//  내비게이션 메타포 매핑
//    현재 위치      → CurrentPosition
//    목적지 + 경로   → Route
//    "이 길도 있어요" → Route.isHiddenRoute
//    예상 소요시간    → Route.estimatedMonths
// ----------------------------------------------------------------------------

/** 전이성 2×2 사분면 */
export type Quadrant =
  | 'leverage'  // 높은 확산 + 높은 희소  → 피벗 무기 ★ 강조 표시
  | 'lockin'    // 낮은 확산 + 높은 희소  → 도메인 락인 (탈출 비용 큼)
  | 'common'    // 높은 확산 + 낮은 희소  → 흔한 역량 (차별화 X)
  | 'noise';    // 낮은 확산 + 낮은 희소  → 노이즈 (화면에서 제외 가능)

/** 스킬 하나 = 2×2 지도 위의 점 하나 */
export interface Skill {
  id: string;
  name: string;
  quadrant: Quadrant;
  /** 0~1 · 여러 직무에 통하는 정도 → 지도 가로축 */
  spread: number;
  /** 0~1 · 희소성 → 지도 세로축 */
  scarcity: number;
  /** 0~1 · 최신성 가중 숙련도 → 점 크기 */
  proficiency: number;
  /** 이 스킬의 근거가 된 이력서 원문 문장 (설명가능성 — 반드시 원문 그대로) */
  evidence: string;
}

/** 현재 위치 */
export interface CurrentPosition {
  /** 경력자면 최근 직무명, 신입/취준생이면 "신입" 또는 준비 중인 직무 */
  jobTitle: string;
  jobFamily: string;
  /** 신입·취준생은 0. 화면에서는 "신입"으로 표시된다 */
  careerMonths: number;
  /** 산업 (전환 성공률의 최강 단일 변수). 판단 불가 시 null */
  industry: string | null;
  /** 한 문장 요약 — 랜딩 상단에 그대로 노출 */
  summary: string;
}

/** 경로 난이도 */
export type RouteDifficulty = 'easy' | 'moderate' | 'challenging';

/** 채워야 할 역량 하나 */
export interface GapSkill {
  name: string;
  /** 0~1 · 학습 난이도 → 게이지 길이 */
  difficulty: number;
  /** 첫 번째 단계 — 추상어 금지, 구체적 행동 한 문장 */
  firstStep: string;
}

/** 목적지 하나 = 경로 하나 */
export interface Route {
  id: string;
  /** 목적지 직무명 */
  destination: string;
  jobFamily: string;
  /** 0~100 · 적합도 */
  fitScore: number;
  /** 0~100 · '몰랐을 법한' 정도 */
  surpriseScore: number;
  /** true면 "이 길도 있어요" 배지 — routes 중 최소 1개는 반드시 true */
  isHiddenRoute: boolean;
  difficulty: RouteDifficulty;
  /** 예상 준비 기간(개월) */
  estimatedMonths: number;
  /** 이미 가진 무기 — 그대로 통하는 스킬명 (Skill.name과 일치) */
  bridgeSkills: string[];
  /** 채워야 할 것 (2~4개) */
  gapSkills: GapSkill[];
  /**
   * 요구 역량 전부와 충족 여부 (선택). 화면에서 "8가지 중 5가지"를 펼쳐 보여주기 위한 것.
   * 숫자만 보여주면 무엇이 8개고 무엇을 갖췄는지 확인할 수 없다.
   */
  requirements?: RouteRequirement[];
  /**
   * 연봉 구간과 직업전망 (선택). 고용24 직업정보 API 에서 받은 **실제 자료**다.
   * ⚠️ 액수가 아니라 구간이다 — 목록 API 가 액수를 주지 않아 avgSal 코드로 역산했다.
   * ⚠️ 최상단이 '5천만원 이상' 이라 24직무 중 21개가 같은 칸이다. 이것만으로는 직무가 갈리지 않는다.
   */
  salaryBand?: string;
  /** 증가 · 다소 증가 · 유지 · 다소 감소 · 감소 */
  prospect?: string;
  /** 왜 이 경로인지 한 문장 — 근거 중심, 칭찬 금지 */
  reason: string;
  /** 시장 상황 한 줄. 데이터 없으면 null */
  marketNote: string | null;
}

/** 요구 역량 한 줄 — 무엇을 요구하고, 갖췄는지, 무엇으로 갖췄는지 */
export interface RouteRequirement {
  name: string;
  /** 필수인가 우대인가 */
  tier: 'required' | 'preferred';
  /** 갖췄는가 */
  met: boolean;
  /**
   * 그 이름 그대로 갖춘 것이 아니라 **대체재로 충족**한 경우 그 묶음 이름.
   * 예) iOS 개발자가 Kotlin 을 안 가졌지만 같은 '모바일 플랫폼'의 iOS·Swift 를 가진 경우.
   */
  viaGroup?: string;
}

/** 최종 응답 — B는 이것만 보고 화면을 그린다 */
export interface AnalysisResult {
  version: '1.0';
  currentPosition: CurrentPosition;
  /** 8~15개 권장 */
  skills: Skill[];
  /** 정확히 3개 */
  routes: Route[];
  /** ISO 8601 */
  generatedAt: string;
}

// ----------------------------------------------------------------------------
//  API 계약
// ----------------------------------------------------------------------------

export interface AnalyzeRequest {
  resumeText: string;
  /** 선택 · 가고 싶은 직무가 있으면 */
  targetJob?: string;
}

export type ErrorCode =
  | 'TOO_SHORT'    // 이력서가 너무 짧음 (< 200자)
  | 'RATE_LIMIT'   // 일일 호출 상한 도달
  | 'LLM_FAILED'   // 추출 실패 / JSON 파싱 실패
  | 'UNKNOWN';

export type AnalyzeResponse =
  | { ok: true; data: AnalysisResult }
  | { ok: false; code: ErrorCode; message: string };

// ----------------------------------------------------------------------------
//  샘플 프로필 (심사위원·투표자는 자기 이력서를 넣지 않는다 → 필수 기능)
//  결과를 사전 캐싱해두면 응답 즉시 + API 비용 0
// ----------------------------------------------------------------------------

export interface SampleProfile {
  id: string;
  /** 버튼 라벨 — 예: "마케터 5년차" */
  label: string;
  /** 한 줄 설명 — 예: "PM 전환을 고민 중" */
  hint: string;
  resumeText: string;
  /** 사전 계산된 결과 (LLM 호출 없이 즉시 렌더) */
  cachedResult: AnalysisResult;
}

// ----------------------------------------------------------------------------
//  회사·채용공고 — 현재는 가상 데이터, 실제 서비스에서는 같은 계약으로 교체
// ----------------------------------------------------------------------------

export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export type CompanyStage = 'early' | 'growth' | 'stable' | 'enterprise';
export type PostingLevel = '신입' | '주니어' | '미들' | '시니어' | '리드';

export interface CompanyBrand {
  /** 이미지가 없을 때 쓰는 1~2글자 이니셜 */
  initials: string;
  colorFrom: string;
  colorTo: string;
}

/** 회사 조회 화면의 계약. 실제 회사 데이터도 이 형태로 정규화한다. */
export interface Company {
  id: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  stage: CompanyStage;
  employeeCountRange: string;
  foundedYear: number;
  headquarters: string;
  locations: string[];
  workModes: WorkMode[];
  productDescription: string;
  products: string[];
  tags: string[];
  culture: string[];
  benefits: string[];
  hiringProcess: string[];
  /** 가상 회사는 실제 웹사이트·로고를 만들지 않는다. 실제 연동 시 채운다. */
  websiteUrl: string | null;
  imageUrls: string[];
  brand: CompanyBrand;
  isSynthetic: true;
  synthesisBasis: string;
  generatedAt: string;
}

export interface PostingSalary {
  display: string;
  min?: number;
  max?: number;
  currency: 'KRW';
  unit: '만원';
}

/** 지원자가 조회하는 채용공고 계약. 요구 역량은 온톨로지 skill id를 참조한다. */
export interface JobPosting {
  id: string;
  companyId: string;
  jobId: string;
  title: string;
  jobFamily: string;
  level: PostingLevel;
  minCareerMonths: number;
  maxCareerMonths: number | null;
  employmentType: '정규직' | '계약직';
  workMode: WorkMode;
  location: string;
  summary: string;
  responsibilities: string[];
  mustSkillIds: string[];
  niceSkillIds: string[];
  benefits: string[];
  hiringProcess: string[];
  applicationDocuments: string[];
  salary: PostingSalary;
  postedAt: string;
  deadlineType: 'rolling' | 'date';
  deadline: string | null;
  status: 'open';
  isSynthetic: true;
  synthesisBasis: string;
  generatedAt: string;
}

export type PostingDraftSource = 'manual' | 'ai';

/**
 * 게시 전 공고 초안. 게시 일시·마감일·공개 상태처럼 아직 사실이 아닌 값은
 * JobPosting에 맞추려고 만들지 않는다. 실제 게시 시 검증 후 JobPosting으로 변환한다.
 */
export interface PostingDraft {
  companyId: string;
  jobId: string;
  title: string;
  jobFamily: string;
  level: PostingLevel;
  minCareerMonths: number;
  maxCareerMonths: number | null;
  employmentType: '정규직' | '계약직';
  workMode: WorkMode;
  location: string;
  summary: string;
  responsibilities: string[];
  mustSkillIds: string[];
  niceSkillIds: string[];
  benefits: string[];
  hiringProcess: string[];
  applicationDocuments: string[];
  salary: PostingSalary;
  status: 'draft';
  source: PostingDraftSource;
  isSynthetic: true;
}

export interface PostingDraftRequest {
  companyId: string;
  jobId: string;
  level: PostingLevel;
  employmentType: '정규직' | '계약직';
  workMode: WorkMode;
  location: string;
  context: string;
  mustSkillIds: string[];
  niceSkillIds: string[];
}

export type PostingDraftResponse =
  | { ok: true; data: PostingDraft; provider: 'gemini' | 'anthropic' | 'mock'; warnings: string[] }
  | { ok: false; code: 'INVALID_INPUT' | 'RATE_LIMIT' | 'LLM_FAILED'; message: string };

export type ApplicationStage = 'new' | 'screening' | 'interview' | 'offer' | 'hold' | 'rejected';

export interface CandidateSkillEvidence {
  skillId: string;
  evidence: string;
}

/** 기업용 목업 지원자. 실제 연동 시 지원자 동의 범위 안의 필드만 매핑한다. */
export interface EmployerCandidate {
  id: string;
  alias: string;
  currentJobId: string;
  currentJobTitle: string;
  jobFamily: string;
  careerMonths: number;
  industry: string | null;
  location: string;
  summary: string;
  skillIds: string[];
  skillEvidence: CandidateSkillEvidence[];
  experienceHighlights: string[];
  desiredWorkModes: WorkMode[];
  isSynthetic: true;
  synthesisBasis: string;
  generatedAt: string;
}

/** 한 지원자가 특정 공고에 지원한 사실과 현재 전형 상태를 분리해 보관한다. */
export interface CandidateApplication {
  id: string;
  postingId: string;
  candidateId: string;
  appliedAt: string;
  stage: ApplicationStage;
  source: 'direct' | 'recommendation';
  isSynthetic: true;
  synthesisBasis: string;
  generatedAt: string;
}

export interface EmployerCandidateMatch {
  candidate: EmployerCandidate;
  application: CandidateApplication;
  fitScore: number;
  mustCoverage: number;
  niceCoverage: number;
  matchedSkillIds: string[];
  coveredViaSkillIds: string[];
  gapSkillIds: string[];
  onboardingMonths: number;
  careerFit: boolean;
  isDifferentRole: boolean;
}

/** 지원 이력이 없는 인재풀 후보의 평가 결과. */
export type TalentCandidateMatch = Omit<EmployerCandidateMatch, 'application'>;

// ============================================================================
//  기업 화면 (B2B) — 직무 → 지원자 매칭
//
//  개인 화면의 "이 길도 있어요"와 정확히 대칭이다.
//  같은 스킬 어휘를 반대 방향으로 조회할 뿐.
//    개인: 내 역량  → 갈 수 있는 직무
//    기업: 요구 역량 → 맞는 사람 (직무명이 달라도)
// ============================================================================

/** 채용 직무의 요구 역량 */
export interface JobRequirement {
  id: string;
  title: string;
  jobFamily: string;
  /** 필수 — 가중치 3 */
  mustSkills: string[];
  /** 우대 — 가중치 1 */
  niceSkills: string[];
}

/** 지원자 (샘플 풀) */
export interface Candidate {
  id: string;
  /** 익명 표기 — 실제 서비스에서는 지원자가 공개 동의한 범위만 노출 */
  alias: string;
  currentJobTitle: string;
  jobFamily: string;
  /** 12개월 미만이면 신입으로 표시된다 */
  careerMonths: number;
  industry: string | null;
  /** 보유 역량 (Skill.name 과 같은 어휘를 쓴다) */
  skills: string[];
}

/** 신입 판정 기준 — 화면·필터에서 공통으로 쓴다 */
export const NEWCOMER_MONTHS = 12;
export const isNewcomer = (careerMonths: number) => careerMonths < NEWCOMER_MONTHS;

/** 매칭 결과 — lib/matching.ts 가 계산한다. 하드코딩 금지. */
export interface CandidateMatch {
  candidate: Candidate;
  /** 0~100 · must 커버율×3 + nice 커버율×1 */
  fitScore: number;
  /** 직군이 공고와 다름 = 직무명 필터로는 안 잡히는 사람 */
  isCrossRole: boolean;
  matchedSkills: string[];
  gapSkills: GapSkill[];
  /** 부족 역량의 학습 난이도 합으로 추정 */
  onboardingMonths: number;
}

export interface EmployerResult {
  requirement: JobRequirement;
  /** fitScore 내림차순 */
  matches: CandidateMatch[];
}
