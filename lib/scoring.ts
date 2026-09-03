import type { AnalysisResult, GapSkill, Route, Skill } from '@/types';
import type { Extracted } from '@/lib/llm';
import { JOBS, SKILL_STATS, getSkill, requirementsOf, resolveSkill } from '@/lib/skill-index';
import { isNewcomer } from '@/types';

// ============================================================================
//  점수 계산 — 여기서만 숫자가 만들어진다. LLM 은 '무엇을 했는가'만 뽑는다.
//
//  fitScore      = 100 × (필수 커버율×3 + 우대 커버율×1) / 4
//  surpriseScore = 직군이 다른데 적합도가 높을수록 높다 (= 직무명으로는 안 보이는 경로)
//  estimatedMonths = 부족 역량의 학습 난이도 합 × 3
// ============================================================================

const MUST_W = 3, NICE_W = 1;

function toGap(skillId: string): GapSkill {
  const s = getSkill(skillId)!;
  return { name: s.name, difficulty: s.learnDifficulty, firstStep: s.firstStep };
}

export function buildAnalysis(ex: Extracted): AnalysisResult {
  // 1) 추출된 자유 표기 → 온톨로지 skillId
  const resolved = new Map<string, string>(); // skillId -> evidence
  const unresolved: string[] = [];
  for (const c of ex.skillCandidates) {
    const id = resolveSkill(c.name);
    if (id) {
      if (!resolved.has(id)) resolved.set(id, c.evidenceText || c.name);
    } else {
      unresolved.push(c.name);
    }
  }
  // 매칭 실패한 스킬명을 남긴다 — 온톨로지 어휘와 LLM 출력이 어긋나는 지점을 찾기 위함
  console.log(
    `[scoring] LLM 추출 ${ex.skillCandidates.length}개 → 매칭 ${resolved.size}개` +
    (unresolved.length ? ` · 실패: ${unresolved.join(', ')}` : '')
  );
  const have = new Set(resolved.keys());

  // 2) 스킬 지도
  const skills: Skill[] = [...resolved.entries()].map(([id, evidence], i) => {
    const meta = getSkill(id)!;
    const st = SKILL_STATS.get(id);
    return {
      id: `sk_${i + 1}`,
      name: meta.name,
      quadrant: st?.quadrant ?? 'noise',
      spread: Number((st?.spread ?? 0.3).toFixed(2)),
      scarcity: Number((st?.scarcity ?? 0.5).toFixed(2)),
      proficiency: 0.7,
      evidence,
    };
  });

  // 3) 현재 직군 추정 — 보유 역량이 가장 많이 겹치는 직무의 직군
  const scored = JOBS.map((job) => {
    const { must, nice } = requirementsOf(job.id);
    const mustHit = must.filter((s) => have.has(s));
    const niceHit = nice.filter((s) => have.has(s));
    const mustCov = must.length ? mustHit.length / must.length : 0;
    const niceCov = nice.length ? niceHit.length / nice.length : 0;
    const fitScore = Math.round((100 * (mustCov * MUST_W + niceCov * NICE_W)) / (MUST_W + NICE_W));
    return { job, must, nice, mustHit, niceHit, fitScore };
  }).sort((a, b) => b.fitScore - a.fitScore);

  const currentFamily = ex.currentPosition.jobFamily || scored[0]?.job.family || '기획';

  // ── 신입 필터 ────────────────────────────────────────────────
  //  경력이 없는 사람에게 아키텍트·엔지니어링 리더를 추천하면 신뢰를 잃는다.
  //  실측: 취준생 입력에 아키텍트(신입 채용 비율 0.03)가 3순위로 노출됐다.
  //  newcomerRatio 가 없는 직무는 판단하지 않고 통과시킨다 (데이터 미확보 시 과도한 배제 방지).
  const NEWCOMER_MIN_RATIO = 0.15;
  const isJobseeker = isNewcomer(ex.currentPosition.careerMonths ?? 0);
  const openToNewcomer = (job: (typeof JOBS)[number]) =>
    !isJobseeker || job.newcomerRatio === undefined || job.newcomerRatio >= NEWCOMER_MIN_RATIO;

  // 4) 경로 3선 — 직군이 다른데 적합한 경로를 최소 1개 보장
  const withSurprise = scored
    .filter((s) => s.fitScore >= 30)
    .filter((s) => openToNewcomer(s.job))
    .map((s) => {
      const cross = s.job.family !== currentFamily;
      const surpriseScore = cross
        ? Math.min(100, Math.round(40 + 0.6 * s.fitScore))
        : Math.round(0.3 * s.fitScore);
      return { ...s, cross, surpriseScore };
    });

  // "이 길도 있어요" 배지는 강조 장치다. 적합도가 낮은 경로에 붙이면 신뢰를 잃는다.
  //  실측: 취준생 입력에 아키텍트(적합도 30)가 hidden 으로 잡혀 신입에게 시니어 직무를 권하는 결과가 나왔다.
  //  → 직군을 넘더라도 최소 적합도를 넘겨야 배지를 준다. 못 넘기면 일반 경로로만 노출된다.
  const HIDDEN_MIN_FIT = 40;
  const hidden = withSurprise
    .filter((s) => s.cross && s.fitScore >= HIDDEN_MIN_FIT)
    .sort((a, b) => b.surpriseScore - a.surpriseScore)[0];
  const picked = [
    ...withSurprise.filter((s) => s.job.id !== hidden?.job.id).slice(0, hidden ? 2 : 3),
    ...(hidden ? [hidden] : []),
  ].sort((a, b) => b.fitScore - a.fitScore);

  const routes: Route[] = picked.map((s, i) => {
    const gaps = s.must.filter((m) => !have.has(m)).map(toGap);
    const total = gaps.reduce((a, g) => a + g.difficulty, 0);
    const isHidden = !!hidden && s.job.id === hidden.job.id;
    return {
      id: `rt_${i + 1}`,
      destination: s.job.title,
      jobFamily: s.job.family,
      fitScore: s.fitScore,
      surpriseScore: s.surpriseScore,
      isHiddenRoute: isHidden,
      difficulty: total <= 1 ? 'easy' : total <= 2 ? 'moderate' : 'challenging',
      estimatedMonths: Math.max(1, Math.round(total * 3)),
      bridgeSkills: [...s.mustHit, ...s.niceHit].map((id) => getSkill(id)!.name).slice(0, 5),
      gapSkills: gaps.slice(0, 3),
      reason: isHidden
        ? `${s.job.family} 직군이지만 필요한 역량 ${s.mustHit.length}개를 이미 갖추고 있습니다. 직무명이 달라 검색으로는 잘 드러나지 않는 경로입니다.`
        : `요구 역량 ${s.must.length}개 중 ${s.mustHit.length}개를 이미 보유하고 있습니다.`,
      marketNote:
        isJobseeker && s.job.newcomerRatio !== undefined
          ? `공고 ${s.job.sampleSize}건 기준 · 신입 지원 가능 공고 ${Math.round(s.job.newcomerRatio * 100)}%`
          : `이 직무는 공고 ${s.job.sampleSize}건을 분석해 요구 역량을 도출했습니다.`,
    };
  });

  return {
    version: '1.0',
    currentPosition: {
      jobTitle: ex.currentPosition.jobTitle || '신입',
      jobFamily: currentFamily,
      careerMonths: ex.currentPosition.careerMonths ?? 0,
      industry: ex.currentPosition.industry ?? null,
      summary: ex.currentPosition.summary || '입력한 경험에서 역량을 추출했습니다.',
    },
    skills,
    routes,
    generatedAt: new Date().toISOString(),
  };
}
