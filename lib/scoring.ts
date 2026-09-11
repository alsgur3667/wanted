import type { AnalysisResult, GapSkill, Route, RouteRequirement, Skill } from '@/types';
import type { Extracted } from '@/lib/llm';
import { JOBS, SKILL_STATS, claimOf, coverage, resolveJobTitle, confidenceOf, getSkill, isCrossFamilySkill, neighborsOf, groupLabelOf, groupOf, jobAdjustOf, peerPathsOf, requirementsOf, resolveSkill, satisfied } from '@/lib/skill-index';
import { isNewcomer } from '@/types';

// ============================================================================
//  점수 계산 — 여기서만 숫자가 만들어진다. LLM 은 '무엇을 했는가'만 뽑는다.
//
//  fitScore      = 100 × (필수 커버율×3 + 우대 커버율×1 + 강점 반영×2) / 6 × 경력 적합도
//                  + 현재 직무가 정확히 일치하면 최대 8점
//  evidenceScore = fitScore 원점수 × 표본 신뢰도 × 직무 보정 (숨은 경로·낮은 확신 판정 전용)
//  추천 순위      = 화면에 보이는 fitScore 우선, 동점일 때만 evidenceScore 사용
//  surpriseScore = 직군이 다른데 적합도가 높을수록 높다 (= 직무명으로는 안 보이는 경로)
//  estimatedMonths = 부족 역량의 학습 난이도 합 × 3
// ============================================================================

const MUST_W = 3, NICE_W = 1;
const CURRENT_JOB_BONUS = 8;

// ── 경력 반영 ────────────────────────────────────────────────────────
//
//  왜 필요한가
//    연차를 뽑아 놓고 점수에 안 썼다. 6년차 인프라 엔지니어 62점 · 부트캠프 신입 52점 —
//    10점 차이다. 사용자가 이 숫자를 믿기 어렵다.
//
//  ⚠️ 연차 자체를 더하면 안 된다. 9년차 iOS 개발자가 QA 에 지원해도 9년이니까 점수가
//     오르면 틀린 답이다. 경력은 **그 직무가 경력을 요구할 때만** 의미가 있다.
//
//  그래서 직무마다 다른 '신입 채용 비율' 을 쓴다 (jobs.json 의 newcomerRatio).
//     엔지니어링 리더 2% · 아키텍트 3%   신입에게 거의 안 열린다
//     QA 45% · 그래픽 디자이너 45%      신입에게 열려 있다
//
//  ⚠️ 올리지는 않는다. 경력자에게 모든 직무의 점수를 올려 주면 직무 간 순위가 그대로인 채
//     숫자만 부푼다. **모자랄 때만 깎는다.**
//  ⚠️ newcomerRatio 는 손으로 넣은 값이다(ratioSource=manual). 공고에서 잰 값이 아니라
//     이 벌점의 근거가 그만큼 약하다. 공고의 경력 요구를 세어 바꾸는 것이 다음 일이다.
const EXP_PENALTY = 0.35;      // 최대 벌점
const EXP_FULL_MONTHS = 60;    // 5년이면 '경력을 갖췄다'로 본다

/** 그 직무가 원하는 경력에 견줘 얼마나 모자란가 → 0.65~1.0 배 */
function experienceFitOf(jobId: string, careerMonths: number | undefined): number {
  if (careerMonths === undefined || careerMonths === null) return 1;   // 모르면 깎지 않는다
  const job = JOBS.find((j) => j.id === jobId);
  const newcomer = job?.newcomerRatio;
  if (newcomer === undefined || newcomer === null) return 1;           // 근거 없으면 깎지 않는다
  const need = 1 - newcomer;                                          // 이 직무가 경력을 원하는 정도
  const have = Math.min(1, Math.max(0, careerMonths) / EXP_FULL_MONTHS);
  return 1 - EXP_PENALTY * Math.max(0, need - have);
}

// ── 강점 반영 ────────────────────────────────────────────────────────
//
//  기존 점수는 "이 직무가 원하는 것을 후보가 가졌나"만 물었다.
//  "후보의 강점을 이 직무가 쓰는가"는 묻지 않아서, 8년차 iOS 개발자의
//  iOS·Swift·Android 가 점수에 거의 반영되지 않았다(모바일 개발자 3순위, 적합도 35).
//
//  claim = 이 직무가 그 스킬의 수요에서 차지하는 몫. iOS 0.52 · Swift 0.54 · Android 0.61 처럼
//  한 직무에 몰린 스킬은 그 직무를 강하게 가리킨다.
const STRENGTH_W = 2;

/** 후보의 강점을 이 직무가 얼마나 설명하는가 (0~1, 절대값) */
function strengthOf(jobId: string, have: Set<string>): number {
  if (!have.size) return 0;
  let sum = 0;
  for (const s of have) sum += claimOf(jobId, s);
  return sum / have.size;
}

function toGap(skillId: string): GapSkill {
  const s = getSkill(skillId)!;
  return { name: s.name, difficulty: s.learnDifficulty, firstStep: s.firstStep };
}

function requirementSlotStats(required: string[], covered: string[]) {
  const keyOf = (id: string) => groupOf(id) ?? `skill:${id}`;
  const all = new Set(required.map(keyOf));
  const met = new Set(covered.map(keyOf));
  return { total: all.size, covered: [...met].filter((key) => all.has(key)).length };
}

/** LLM의 자유 형식 직군명을 현재 데이터의 세 직군으로 정규화한다. */
export function normalizeJobFamily(raw: string | undefined, fallback = '기획'): string {
  const value = (raw ?? '').toLowerCase().replace(/[\s_/-]+/g, '');
  if (/디자인|design|ux|ui/.test(value)) return '디자인';
  if (/개발|엔지니어|engineer|developer|데이터|data|보안|security|qa|devops/.test(value)) return '개발';
  if (/기획|product|project|manager|pm|마케팅|영업|고객|인사|재무/.test(value)) return '기획';
  return fallback;
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
  // 명시된 현재 직무는 역량과 별개의 강한 근거다. 다만 직무명만 적어도 고득점이 되지
  // 않도록 역량 기반 점수를 대체하지 않고 최대 8점만 더한다.
  const currentJobId = resolveJobTitle(ex.currentPosition.jobTitle);

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
  //
  //  강점 반영은 '가장 잘 맞는 직무 대비'로 잰다. 절대값은 0.1~0.5 라 그대로 더하면
  //  총점이 통째로 눌려 아래 내부 순위 문턱(30)에 전부 걸린다.
  const rawStrength = new Map(JOBS.map((j) => [j.id, strengthOf(j.id, have)]));
  const maxStrength = Math.max(...rawStrength.values(), 0);

  const scored = JOBS.map((job) => {
    //  택일 관계는 면제한다 — iOS 개발자에게 Kotlin 을 부족 역량으로 요구하지 않는다.
    //  covered 는 '채워진 것으로 치는 요구', hit 은 '실제로 가진 것'이다.
    const { must, nice } = requirementsOf(job.id);
    const m = satisfied(must, have);
    const n = satisfied(nice, have);
    const mustHit = m.hit, niceHit = n.hit;
    //  ⚠️ 칸 수가 아니라 무게로 센다. 이유는 skill-index.coverage() 주석 참조.
    //     칸을 세면 택일 묶음이 칸을 부풀리고(Angular 하나로 3칸), 목록을 다듬으면
    //     사람은 그대로인데 점수가 변한다.
    const mustCov = coverage(job.id, must, have);
    const niceCov = coverage(job.id, nice, have);
    const mustSlots = requirementSlotStats(must, m.covered);
    const niceSlots = requirementSlotStats(nice, n.covered);
    const strength = maxStrength ? (rawStrength.get(job.id) ?? 0) / maxStrength : 0;
    // 표본이 7건인 직무의 요구 역량을 280건인 직무와 같은 확신으로 순위화할 수 없다.
    const raw = (100 * (mustCov * MUST_W + niceCov * NICE_W + strength * STRENGTH_W))
      / (MUST_W + NICE_W + STRENGTH_W);
    //  직무 자체의 성격도 반영한다 — 정의가 넓고 남에게 흡수되는 직무는 낮춘다.
    //  경력도 반영한다 — 그 직무가 경력을 원하는데 모자라면 깎는다. 넘치면 깎지 않는다.
    const experienceFit = experienceFitOf(job.id, ex.currentPosition.careerMonths);
    // 사용자에게 보여주는 적합도에는 후보와 무관한 표본 수·직무 구조 보정을 섞지 않는다.
    // 이전에는 모바일 개발자의 이론상 최고점이 78점이라 완벽히 맞아도 낮아 보였다.
    const skillFit = raw * experienceFit;
    const currentJobBonus = job.id === currentJobId
      ? Math.min(CURRENT_JOB_BONUS, Math.max(0, 100 - skillFit))
      : 0;
    const fitScore = Math.round(skillFit + currentJobBonus);
    // 표본이 적거나 다른 직무를 흡수하기 쉬운 직무는 숨은 경로를 고를 때 보수적으로 다룬다.
    // 이 값을 일반 정렬에 곱하면 85점 경로가 66점 경로 아래에 놓이는 UI 모순이 생긴다.
    const evidenceScore = raw * experienceFit * confidenceOf(job.id) * jobAdjustOf(job.id);
    return { job, must, nice, mustHit, niceHit,
             mustCovered: m.covered, niceCovered: n.covered,
             mustCov, mustSlots, niceSlots, fitScore, evidenceScore, currentJobBonus };
  }).sort((a, b) => b.fitScore - a.fitScore || b.evidenceScore - a.evidenceScore);

  //  지금 하고 있는 직무. 「이 길도 있어요」가 여기에 붙으면 안 된다.
  //  ⚠️ 점수 1위(scored[0])와 헷갈리면 안 된다. 7년차 PM 에게 프로덕트 매니저를
  //     '몰랐던 길' 로 붙인 사고가 그것 때문이었다.
  const currentJobFamily = JOBS.find((j) => j.id === currentJobId)?.family;
  const currentFamily = currentJobFamily
    ?? normalizeJobFamily(ex.currentPosition.jobFamily, scored[0]?.job.family || '기획');

  // ── 신입 필터 ────────────────────────────────────────────────
  //  경력이 없는 사람에게 아키텍트·엔지니어링 리더를 추천하면 신뢰를 잃는다.
  //  실측: 취준생 입력에 아키텍트(신입 채용 비율 0.03)가 3순위로 노출됐다.
  //  newcomerRatio 가 없는 직무는 판단하지 않고 통과시킨다 (데이터 미확보 시 과도한 배제 방지).
  const NEWCOMER_MIN_RATIO = 0.15;
  const isJobseeker = isNewcomer(ex.currentPosition.careerMonths ?? 0);
  const openToNewcomer = (job: (typeof JOBS)[number]) =>
    !isJobseeker || job.newcomerRatio === undefined || job.newcomerRatio >= NEWCOMER_MIN_RATIO;

  // 4) 경로 3선 — 근거가 충분할 때만 직군이 다른 숨은 경로를 포함한다.
  //  적합도 문턱 — 넘는 것이 하나도 없으면 문턱을 버리고 상위 3개를 그대로 보여준다.
  //
  //  왜 그러나 — 문턱만 두면 '역량을 충분히 찾지 못했습니다' 오류가 난다.
  //  역량은 찾았는데 어느 직무에도 확신 있게 맞지 않는 경우가 있다.
  //  그때 "못 찾았다"고 말하는 것은 거짓이다. 낮은 점수를 낮은 대로 보여주는 편이 정직하다.
  //  ⚠️ 계약은 routes 를 **정확히 3개**로 정한다(types.ts). 문턱으로 잘라내면 안 된다.
  //
  //  전에는 내부 순위점수 30 미만을 버렸는데, 요구 역량을 3~8개로 늘리면서 커버율이 낮아져
  //  경로가 2개만 나오는 일이 생겼다. 계약 위반이고, 화면도 3개를 기대하고 그려져 있다.
  //
  //  문턱은 **자르는 데 쓰지 않고 확신이 낮다고 알리는 데**만 쓴다.
  //  낮은 점수를 낮은 대로 보여주는 편이, 아무것도 안 보여주는 것보다 정직하다.
  const MIN_EVIDENCE_SCORE = 30;
  const eligible = scored.filter((s) => openToNewcomer(s.job));
  const withSurprise = eligible.map((s) => {
    const cross = s.job.family !== currentFamily;
    const surpriseScore = cross
      ? Math.min(100, Math.round(40 + 0.6 * s.fitScore))
      : Math.round(0.3 * s.fitScore);
    return { ...s, cross, surpriseScore };
  });

  //  기준 두 개. 실측으로 골랐다 — 프로필 7개를 넣어 보고 오탐이 없는 쪽을 택했다.
  //    ① 그 직무의 **필수** 중 직군을 넘나드는 역량 2개 이상   ← 주 기준. 오탐 0
  //    ② ①이 없으면, 필수+우대 중 직군을 넘나들면서 쉽지 않은 역량 3개 이상
  //
  //  '필수'로 제한하는 것이 핵심이다. 우대까지 세면 Slack·HTML 같은 게 다리로 잡힌다.
  //  실측 — 기술만 적은 8년차 iOS 개발자가 Slack·HTML·CSS 를 다리로 그래픽 디자이너에 연결됐다.
  //  Slack 은 어느 직군에나 있지만 그것 때문에 디자이너가 되지는 않는다.
  //  다리가 있어도 적합도가 너무 낮으면 붙이지 않는다. 문턱은 **두 개**다.
  //    · 표시 적합도 45 — 사용자가 보는 숫자. 배지는 이 숫자 옆에 붙는다.
  //    · 순위점수 25 — 표본이 얇거나 남에게 흡수되는 직무를 걸러 내는 보조 문턱.
  //
  //  ⚠️ 예전에는 순위점수 40 하나만 봤다. 그 값은 **적합도를 무게 기반으로 갈아엎기 전**
  //     척도에서 고른 것이라, 갈아엎은 뒤에는 사실상 아무도 통과하지 못했다 —
  //     샘플 4개 전부 배지가 안 붙었고, 데모에서 이 기능이 죽어 있었다(이슈 #28 후속).
  //     순위점수는 원점수에 표본 신뢰도·직무 보정을 곱한 값이라 표시 적합도의 0.5~0.8배다.
  //     즉 40 은 "다른 직군에서 표시 적합도 50~72" 를 요구하는 셈이었다.
  //
  //  다시 쟀다 — 설문 프로필 2,142건(직무 18개) + 손으로 만든 대조군 3건.
  //    순위점수 40            배지 9.0%  · 개발 직무 0.1% · 평균 표시 적합도 69.4
  //    순위점수 25 · 적합도 45 배지 12.2% · 개발 직무 0.5% · 평균 표시 적합도 61.5
  //    순위점수 25 (바닥 없음) 배지 14.4% · 개발 직무 1.2% · 평균 표시 적합도 56.6  ← 샌다
  //  실제로 거르는 일을 하는 것은 **표시 적합도 바닥**이었다. 순위점수는 대부분 통과시킨다.
  //  35~55 를 훑어도 대조군 판정은 바뀌지 않아, 가운데인 45 로 둔다.
  //
  //  대조군(사람이 정답을 아는 것)
  //    기술만 나열한 8년차 iOS 개발자 → 배지 없음. 옛 오탐이던 그래픽·브랜드 디자이너는
  //      지금 순위점수 4 라 어느 문턱에서도 안 붙는다(무게 기반 적합도가 이미 걸렀다).
  //    퍼블리싱까지 하는 UI 디자이너 → 프론트엔드 개발자(62). 필수 다리 4개.
  //    지표 파이프라인을 겸한 백엔드   → 데이터·비즈니스 기획(50). 넓은 다리 3개.
  const HIDDEN_MIN_EVIDENCE_SCORE = 25;
  const HIDDEN_MIN_FIT_SCORE = 45;   // 사용자가 보는 숫자. 실제로 거르는 일은 이쪽이 한다
  const HIDDEN_MIN_MUST_BRIDGES = 2;
  const HIDDEN_MIN_WIDE_BRIDGES = 3;
  const EASY_SKILL = 0.3;   // 이보다 쉬우면 다리로 세지 않는다

  const bridgesOf = (s: (typeof scored)[number]) => {
    const must = s.mustHit.filter(isCrossFamilySkill);
    const wide = [...s.mustHit, ...s.niceHit]
      .filter((id) => isCrossFamilySkill(id) && (getSkill(id)?.learnDifficulty ?? 0) >= EASY_SKILL);
    return { must, wide };
  };

  const crossJobs = withSurprise
    .filter((s) => s.cross && s.evidenceScore >= HIDDEN_MIN_EVIDENCE_SCORE
      && s.fitScore >= HIDDEN_MIN_FIT_SCORE && s.job.id !== currentJobId)
    .map((s) => ({ ...s, b: bridgesOf(s) }));

  //  ③ 직무 간 인접은 **문턱을 낮추는 데 쓰지 않는다.** 자격을 갖춘 것들 사이의 우선순위에만 쓴다.
  //
  //  처음에는 "다리가 없으면 인접한 직무를 대신 붙이자"로 만들었는데, 적합도 6점짜리에
  //  "이 길도 있어요"가 붙었다. 근거 없는 배지는 안 붙이는 편이 낫다 —
  //  팀원이 이미 같은 사고를 겪었다(취준생에게 순위점수 30짜리 아키텍트를 hidden 으로 권함).
  //
  //  다리가 하나도 없다는 것은 **정말로 건너갈 길이 없다**는 뜻이다. 그때는 붙이지 않는다.
  const anchor = scored[0]?.job.id;
  const nearby = new Set(
    anchor ? neighborsOf(anchor, { crossFamilyOnly: true }).map((n) => n.jobId) : []
  );
  const rank = (s: (typeof crossJobs)[number], n: number) => n * 10 + (nearby.has(s.job.id) ? 1 : 0);

  const byMust = crossJobs
    .filter((s) => s.b.must.length >= HIDDEN_MIN_MUST_BRIDGES)
    .sort((a, b) => rank(b, b.b.must.length) - rank(a, a.b.must.length));
  const byWide = crossJobs
    .filter((s) => s.b.wide.length >= HIDDEN_MIN_WIDE_BRIDGES)
    .sort((a, b) => rank(b, b.b.wide.length) - rank(a, a.b.wide.length));

  let hidden: (typeof crossJobs)[number] | undefined = byMust[0] ?? byWide[0];

  //  다리로 못 찾았으면 **같은 기술을 가진 사람들이 실제로 하는 직무**를 본다.
  //  우리 공고 표본은 직무당 5~280건으로 좁아서 못 보는 경로가 있다.
  //  이건 규칙이 아니라 사실이고, 화면에 근거를 그대로 보여줄 수 있다 —
  //  "Swift 를 쓰는 3,235명 중 39%가 이 직무입니다".
  //
  //  ⚠️ 서구 설문이라 주 순위에는 쓰지 않는다. 여기서만 쓴다 (이슈 #14).
  //  ⚠️ 배수 1.5 미만은 붙이지 않는다 — 기저와 다를 바 없으면 '몰랐던 길'이 아니다.
  const PEER_MIN_LIFT = 1.5;
  let peer: { jobId: string; lift: number; viaSkillId: string; share: number; n: number } | undefined;
  if (!hidden) {
    const already = new Set(eligible.slice(0, 3).map((s) => s.job.id));
    //  ⚠️ 조건 셋을 모두 만족해야 붙인다. 처음엔 배수만 봤다가
    //     ① 이미 프론트엔드인 사람에게 프론트엔드를 '몰랐던 길'로 붙였고
    //     ② 적합도 9점짜리에 배지가 붙었다. 둘 다 근거 없는 배지다.
    peer = peerPathsOf(have).find((p) => {
      const cand = eligible.find((s) => s.job.id === p.jobId);
      return p.lift >= PEER_MIN_LIFT
        && !already.has(p.jobId)                       // 이미 앞에 나온 직무가 아니고
        && cand !== undefined
        && cand.evidenceScore >= HIDDEN_MIN_EVIDENCE_SCORE // 표본 보정 뒤에도 권할 만하고
        && cand.fitScore >= HIDDEN_MIN_FIT_SCORE        // 화면에 보이는 숫자도 권할 만하고
        && cand.job.id !== scored[0]?.job.id           // 점수 1위에 배지를 겹쳐 붙이지 않는다
        && cand.job.id !== currentJobId;               // 지금 하고 있는 그 직무가 아니어야 한다
    });
    if (peer) {
      const cand = eligible.find((s) => s.job.id === peer!.jobId)!;
      hidden = { ...cand, cross: cand.job.family !== currentFamily,
                 surpriseScore: Math.min(100, Math.round(40 + 0.6 * cand.fitScore)),
                 b: bridgesOf(cand) };
    }
  }
  const hiddenBridges = hidden?.b;

  const picked = [
    ...withSurprise.filter((s) => s.job.id !== hidden?.job.id).slice(0, hidden ? 2 : 3),
    ...(hidden ? [hidden] : []),
  ].sort((a, b) => b.fitScore - a.fitScore || b.evidenceScore - a.evidenceScore);

  //  요구 역량 한 줄을 만든다. 대체재로 충족한 것은 어느 묶음으로 충족했는지 밝힌다.
  const reqRow = (id: string, tier: 'required' | 'preferred'): RouteRequirement => {
    const name = getSkill(id)?.name ?? id;
    if (have.has(id)) return { name, tier, met: true };
    const g = groupOf(id);
    const viaGroup = g && [...have].some((h) => groupOf(h) === g)
      ? groupLabelOf(g) : undefined;
    return { name, tier, met: !!viaGroup, ...(viaGroup ? { viaGroup } : {}) };
  };

  const routes: Route[] = picked.map((s, i) => {
    //  대체재를 가진 요구는 부족 역량에서 뺀다. iOS 개발자에게 Kotlin 을 권하지 않는다.
    const covered = new Set(s.mustCovered);
    const gaps = s.must.filter((id) => !covered.has(id)).map(toGap);
    const total = gaps.reduce((a, g) => a + g.difficulty, 0);
    const isHidden = !!hidden && s.job.id === hidden.job.id;
    return {
      id: `rt_${i + 1}`,
      destination: s.job.title,
      jobFamily: s.job.family,
      //  고용24 직업정보에서 받은 실제 값. 없으면 넣지 않는다 — 지어내지 않는다.
      salaryBand: s.job.salaryBand,
      prospect: s.job.prospect,
      fitScore: s.fitScore,
      surpriseScore: s.surpriseScore,
      isHiddenRoute: isHidden,
      difficulty: total <= 1 ? 'easy' : total <= 2 ? 'moderate' : 'challenging',
      estimatedMonths: gaps.length ? Math.max(1, Math.round(total * 3)) : 0,
      //  ⚠️ 근거 문구와 같은 것을 세야 한다.
      //  예전에는 문구가 '필수 5개 중 2개'인데 옆의 '이미 가진 무기'에는 3개가 떴다.
      //  문구는 필수만, 목록은 필수+우대를 세고 있었다. 이제 둘 다 필수 칸을 기준으로 한다.
      bridgeSkills: s.mustHit.map((id) => getSkill(id)!.name).slice(0, 5),
      gapSkills: gaps.slice(0, 3),
      //  요구 역량 전부를 상태와 함께 싣는다.
      //  "8가지 중 5가지"만 보여주면 무엇이 8개고 무엇을 갖췄는지 확인할 수 없다.
      requirements: [
        ...s.must.map((id) => reqRow(id, 'required')),
        ...s.nice.map((id) => reqRow(id, 'preferred')),
      ],
      reason: isHidden && peer && s.job.id === peer.jobId
        ? `${getSkill(peer.viaSkillId)?.name} 를 쓰는 ${peer.n.toLocaleString()}명 중 `
          + `${Math.round(peer.share * 100)}%가 이 직무를 하고 있습니다. `
          + `전체 평균보다 ${peer.lift.toFixed(1)}배 높습니다 — 직무명으로는 잘 안 보이는 경로입니다.`
        : s.evidenceScore < MIN_EVIDENCE_SCORE
        ? `적합도 ${s.fitScore}점으로 근거가 약한 후보입니다. 필수 역량 ${s.mustSlots.total}개 영역 중 ${s.mustSlots.covered}개가 겹칩니다 (가중 ${Math.round(s.mustCov * 100)}%). 어떤 일을 어떻게 했는지 조금 더 적으면 정확해집니다.`
        : isHidden
        ? `${s.job.family} 직군이지만 이 직무가 요구하는 것 중 ${(hiddenBridges?.must.length ?? 0) || (hiddenBridges?.wide.length ?? 0)}개를 이미 갖추고 있습니다 — ${[...new Set([...(hiddenBridges?.must ?? []), ...(hiddenBridges?.wide ?? [])])].slice(0, 3).map((id) => getSkill(id)?.name).filter(Boolean).join(' · ')}. 직군을 넘나드는 역량이라 옮겨도 그대로 쓰입니다.`
        : (() => {
            //  대체재로 충족한 것이 있으면 그렇게 밝힌다.
            //  안 밝히면 "5가지 중 3가지"라는데 옆의 무기는 1개로 보여 또 어긋난다.
            const held = new Set(s.mustHit);
            const bySub = s.mustCovered.filter((id) => !held.has(id));
            const labels = [...new Set(bySub.map((id) => groupLabelOf(groupOf(id) ?? '')).filter(Boolean))];
            const grouped = s.mustSlots.total < s.must.length;
            const base = grouped
              ? `필수 역량 ${s.mustSlots.total}개 영역 중 ${s.mustSlots.covered}개를 충족합니다 (가중 ${Math.round(s.mustCov * 100)}%)`
              : `요구 역량 ${s.must.length}가지 중 ${s.mustCovered.length}가지를 갖추고 있습니다`;
            const sub = labels.length
              ? ` — ${s.mustHit.map((id) => getSkill(id)!.name).slice(0, 2).join('·')} 으로 ${labels.join('·')} 요구를 충족합니다`
              : '';
            const nice = s.niceSlots.covered ? ` (우대 ${s.niceSlots.covered}개 영역 추가)` : '';
            const role = s.currentJobBonus > 0
              ? ` 현재 직무 표기와 일치해 ${Math.round(s.currentJobBonus)}점을 반영했습니다.`
              : '';
            return base + sub + nice + '.' + role;
          })(),
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
