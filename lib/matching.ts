import type { Candidate, CandidateMatch, EmployerResult, GapSkill, JobRequirement } from '@/types';
import { SKILL_META, DEFAULT_META } from '@/data/skill-meta';

// ============================================================================
//  적합도 계산 — 점수는 여기서만 나온다. 하드코딩된 fitScore 는 없다.
//
//  fitScore = 100 × (필수 커버율 × 3 + 우대 커버율 × 1) / 4
//    · 단순 교집합 개수가 아니라 '필수'에 3배 가중을 준다.
//      필수 4개 중 3개 보유(0.75) 가 우대 3개 전부 보유보다 중요하기 때문.
//    · 코사인 유사도를 쓰지 않은 이유: 채용 담당자에게 설명이 안 된다.
//      "필수 4개 중 3개 보유"는 그대로 화면에 쓸 수 있다.
// ============================================================================

const MUST_WEIGHT = 3;
const NICE_WEIGHT = 1;

/** 부족 역량 난이도 합 → 온보딩 개월 추정 (난이도 1.0 ≈ 3개월) */
function estimateOnboarding(gaps: GapSkill[]): number {
  const total = gaps.reduce((s, g) => s + g.difficulty, 0);
  return gaps.length ? Math.max(1, Math.round(total * 3)) : 0;
}

const normalizeRoleTitle = (title: string) => title.toLowerCase().replace(/[\s_/-]+/g, '');

/** 채용 직무명 검색에서 실제로 같은 제목으로 잡히는 후보인지 판정한다. */
export function isSameRoleTitle(req: JobRequirement, candidate: Candidate): boolean {
  return normalizeRoleTitle(req.title) === normalizeRoleTitle(candidate.currentJobTitle);
}

function toGap(name: string): GapSkill {
  const meta = SKILL_META[name] ?? DEFAULT_META;
  return { name, difficulty: meta.difficulty, firstStep: meta.firstStep };
}

export function matchCandidate(req: JobRequirement, c: Candidate): CandidateMatch {
  const has = new Set(c.skills);

  const mustHit = req.mustSkills.filter((s) => has.has(s));
  const niceHit = req.niceSkills.filter((s) => has.has(s));

  const mustCov = req.mustSkills.length ? mustHit.length / req.mustSkills.length : 0;
  const niceCov = req.niceSkills.length ? niceHit.length / req.niceSkills.length : 0;

  const activeNiceWeight = req.niceSkills.length ? NICE_WEIGHT : 0;
  const fitScore = Math.round(
    (100 * (mustCov * MUST_WEIGHT + niceCov * activeNiceWeight)) / (MUST_WEIGHT + activeNiceWeight)
  );

  const gapSkills = req.mustSkills.filter((s) => !has.has(s)).map(toGap);

  return {
    candidate: c,
    fitScore,
    // 직군이 다르면 인접 직군을 건너온 후보로 표시한다.
    isCrossRole: c.jobFamily !== req.jobFamily,
    matchedSkills: [...mustHit, ...niceHit],
    gapSkills,
    onboardingMonths: estimateOnboarding(gapSkills),
  };
}

export function buildEmployerResult(
  req: JobRequirement,
  pool: Candidate[],
  opts: { includeDifferentRole: boolean; minFit?: number } = { includeDifferentRole: true }
): EmployerResult {
  const minFit = opts.minFit ?? 40;
  const matches = pool
    .map((c) => matchCandidate(req, c))
    .filter((m) => m.fitScore >= minFit)
    .filter((m) => opts.includeDifferentRole || isSameRoleTitle(req, m.candidate))
    .sort((a, b) => b.fitScore - a.fitScore || a.onboardingMonths - b.onboardingMonths);

  return { requirement: req, matches };
}
