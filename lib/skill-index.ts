import jobsRaw from '@/data/interim/jobs.json';
import skillsRaw from '@/data/interim/skills.json';
import matrixRaw from '@/data/interim/job-skills.json';
import type { Quadrant } from '@/types';

// ============================================================================
//  직무 × 스킬 매트릭스에서 파생되는 모든 수치를 여기서 만든다.
//  ⚠️ 이 파일은 data/interim/*.json 만 읽는다.
//     팀원 실데이터가 오면 그 3개 파일만 교체하면 되고, 코드는 건드릴 필요가 없다.
// ============================================================================

export type JobRow = {
  id: string; title: string; family: string; aliases: string[]; sampleSize: number;
  /** 신입 채용 비율 0~1. 없으면 판단하지 않는다 */
  newcomerRatio?: number;
  ratioSource?: string;
};
export type SkillRow = { id: string; name: string; type: string; aliases: string[]; learnDifficulty: number; firstStep: string };
export type MatrixRow = { jobId: string; skillId: string; weight: number; docFreq?: number };

export const JOBS = jobsRaw as JobRow[];
export const SKILLS = skillsRaw as SkillRow[];
export const MATRIX = matrixRaw as MatrixRow[];

// ── 필수/우대 구분 ──────────────────────────────────────────────────
//  절대 임계값(weight ≥ 0.6)을 쓰지 않는다.
//
//  공고 수가 많은 직무일수록 weight 가 낮게 나오기 때문이다.
//    임베디드(공고 5건)      Linux 5/5   → 1.00
//    소프트웨어 엔지니어(250건) Python 93/250 → 0.372  ← 사실상 1위인데 0.6 미달
//  고정 임계값을 쓰면 표본이 큰 직무는 필수 역량이 0개가 되어
//  fitScore 가 25점을 넘지 못한다.
//
//  → 직무별 '상대 순위'로 자른다. 표본 크기와 무관하게 필수가 확보된다.
//    설명도 명확하다: "이 직무 공고에서 가장 자주 등장한 상위 N개"
export const MUST_TOP_N = 5;
export const NICE_TOP_N = 5;
/** 스킬이 적은 직무에서 상위 5개가 전부가 되지 않도록 상한 비율 */
export const MUST_MAX_RATIO = 0.4;

const skillById = new Map(SKILLS.map((s) => [s.id, s]));
const jobById = new Map(JOBS.map((j) => [j.id, j]));

/** 표기 흔들림 흡수: 이름·별칭을 정규화한 색인 */
const norm = (s: string) => s.toLowerCase().replace(/[\s\-_./()]/g, '');
const lookup = new Map<string, string>();
for (const s of SKILLS) {
  for (const t of [s.name, ...s.aliases]) lookup.set(norm(t), s.id);
}

/** LLM이 뽑아온 자유 표기 스킬명 → skillId. 매칭 실패하면 null */
export function resolveSkill(raw: string): string | null {
  const k = norm(raw);
  if (lookup.has(k)) return lookup.get(k)!;
  // 부분 일치 (예: "React 개발" → react)
  for (const [key, id] of lookup) {
    if (key.length >= 3 && (k.includes(key) || key.includes(k))) return id;
  }
  return null;
}

// ---------------------------------------------------------------------------
//  전이성 지수 (2×2 지도의 두 축)
//
//    spread   = 수요의 폭  · 몇 개 직무가 이 역량을 요구하는가
//    scarcity = 공급의 희소 · 그 역량을 가진 사람이 얼마나 적은가
//
//  ⚠️ 설계 이력
//   1) KNOW 지식 33개로 계산 → spread 가 0.88~0.98 로 상수화되어 기각
//   2) scarcity 를 log(전체직무/등장직무수) 로 두었더니 spread 와 같은 축을 재게 되어
//      두 축이 구조적으로 반비례. 2×2 가 대각선으로 눌려 leverage 사분면이 비었다.
//   3) → scarcity 를 '공급' 쪽 지표(학습 난이도)로 교체. 수요/공급이 독립 축이 된다.
//      docs/VALIDATION_LOG.md 참고.
// ---------------------------------------------------------------------------
type SkillStat = { spread: number; scarcity: number; quadrant: Quadrant; jobCount: number };

export const SKILL_STATS: Map<string, SkillStat> = (() => {
  const bySkill = new Map<string, number[]>();
  for (const r of MATRIX) {
    if (!bySkill.has(r.skillId)) bySkill.set(r.skillId, []);
    bySkill.get(r.skillId)!.push(r.weight);
  }
  const N = JOBS.length;
  const raw = new Map<string, { spread: number; jobCount: number }>();
  for (const [id, ws] of bySkill) {
    const sum = ws.reduce((a, b) => a + b, 0);
    const p = ws.map((w) => w / sum);
    const H = -p.reduce((a, x) => a + (x > 0 ? x * Math.log(x) : 0), 0);
    // 등장 직무 비율 × 분포의 고름 — 한 직무에 몰린 역량은 spread 가 낮아야 한다
    const evenness = ws.length > 1 ? H / Math.log(ws.length) : 0.5;
    raw.set(id, { spread: (ws.length / N) * evenness, jobCount: ws.length });
  }
  const sp = [...raw.values()].map((v) => v.spread);
  const lo = Math.min(...sp), hi = Math.max(...sp);

  const out = new Map<string, SkillStat>();
  const norm = new Map<string, { spread: number; scarcity: number; jobCount: number }>();
  for (const [id, v] of raw) {
    norm.set(id, {
      spread: hi > lo ? (v.spread - lo) / (hi - lo) : 0.5,
      // 공급 희소성 — 익히기 어려울수록 보유자가 적다는 가정
      scarcity: skillById.get(id)?.learnDifficulty ?? 0.5,
      jobCount: v.jobCount,
    });
  }

  // ── 사분면 경계 ────────────────────────────────────────────────
  //  절대 기준(0.45 등)을 쓰지 않는다. must 임계값에서 겪은 것과 같은 문제다.
  //  스킬 수가 늘수록 대부분의 스킬이 소수 직무에만 등장해 spread 가 0 근처로 몰린다.
  //    실측: 스킬 192개 기준 spread 중앙값 0.09, 0.45 초과는 15개뿐
  //  고정 경계를 쓰면 leverage 사분면이 비고 지도가 왼쪽에 뭉친다.
  //  → 실제 분포의 분위수로 자른다. 데이터가 바뀌어도 사분면이 유지된다.
  const pct = (arr: number[], p: number) => {
    const a = [...arr].sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.floor(a.length * p))];
  };
  const vals = [...norm.values()];
  const SPREAD_CUT = pct(vals.map((v) => v.spread), 0.6);   // 상위 40% = "여러 직무에 통함"
  const SCARCITY_CUT = pct(vals.map((v) => v.scarcity), 0.5);

  for (const [id, v] of norm) {
    const wide = v.spread >= SPREAD_CUT;
    const rare = v.scarcity >= SCARCITY_CUT;
    const quadrant: Quadrant =
      wide && rare ? 'leverage' : !wide && rare ? 'lockin' : wide ? 'common' : 'noise';
    out.set(id, { spread: v.spread, scarcity: v.scarcity, quadrant, jobCount: v.jobCount });
  }
  return out;
})();

/**
 * 직무의 요구 역량 — weight 내림차순 상위 N개를 필수, 그다음 N개를 우대로 본다.
 * 반환값의 순서가 곧 중요도 순서다.
 */
export function requirementsOf(jobId: string) {
  const rows = MATRIX.filter((r) => r.jobId === jobId).sort((a, b) => b.weight - a.weight);
  if (!rows.length) return { must: [], nice: [] };

  // 스킬이 적은 직무에서 상위 5개가 곧 전부가 되는 것을 막는다
  const mustCount = Math.max(1, Math.min(MUST_TOP_N, Math.ceil(rows.length * MUST_MAX_RATIO)));
  return {
    must: rows.slice(0, mustCount).map((r) => r.skillId),
    nice: rows.slice(mustCount, mustCount + NICE_TOP_N).map((r) => r.skillId),
  };
}

export const getSkill = (id: string) => skillById.get(id);
export const getJob = (id: string) => jobById.get(id);
