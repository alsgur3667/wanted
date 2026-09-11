import jobsRaw from '@/data/interim/jobs.json';
import skillsRaw from '@/data/interim/skills.json';
import matrixRaw from '@/data/interim/job-skills.json';
import adjacencyRaw from '@/data/interim/job-adjacency.json';
import groupsRaw from '@/data/interim/skill-groups.json';
import peerRaw from '@/data/interim/peer-paths.json';
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
  /** 고용24 직업정보에서 받은 **실제** 연봉 구간. 목록 API 에 액수가 없어 구간이다. */
  salaryBand?: string;
  salaryLow?: number | null;
  salaryHigh?: number | null;
  /** 직업전망 — 증가 · 다소 증가 · 유지 · 다소 감소 · 감소 */
  prospect?: string;
  salarySource?: string;
};
export type SkillRow = { id: string; name: string; type: string; aliases: string[]; learnDifficulty: number; firstStep: string };
export type MatrixRow = {
  jobId: string; skillId: string; weight: number; docFreq?: number;
  /** 이 직무에서 유난히 많이 요구되는가 = 이 직무 등장률 / 전체 평균 등장률 */
  lift?: number;
  /** 공고 + 직무 해설 글을 합친 근거 비율. 해설 글은 0.5배로 할인해 더한다. */
  evidence?: number;
  /** 여러 출처가 함께 말할수록 높다. evidence 에 합의 가산을 곱한 값. */
  importance?: number;
  /** 이 역량을 말한 출처 수 (공고·해설 글·공인 체계) */
  agreement?: number;
  /** 출처들이 '필수'로 말했나 '있으면 좋다'로 말했나 */
  tier?: 'required' | 'preferred' | null;
  /** 이 직무의 해설 글 중 몇 건이 이 역량을 말했나 */
  guideMentions?: number;
  guideDocs?: number;
  verification?: 'confirmed' | 'corroborated' | 'unverified';
  /** 공고가 자격요건 절에 적었나(required) 우대사항 절에 적었나(preferred) */
  requirement?: 'required' | 'preferred' | null;
  /** 사람이 점검판에서 '필수'로 못 박은 줄 — 강도 문턱을 타지 않는다 */
  pinned?: boolean;
};

export const JOBS = jobsRaw as JobRow[];
export const SKILLS = skillsRaw as SkillRow[];
export const MATRIX = matrixRaw as MatrixRow[];

/** 직무 간 인접 — 요구 역량이 얼마나 겹치는가. 개인 점수와 무관한 사실이다. */
export type AdjacencyEdge = {
  a: string; b: string; similarity: number; crossFamily: boolean; shared: string[];
};
export const ADJACENCY = adjacencyRaw as AdjacencyEdge[];

// ── 택일 관계 묶음 ──────────────────────────────────────────────────
//  "이 중 하나만 있으면 된다". 근거는 scripts/collect/skill_groups.py 에 적어 두었다.
//  묶지 않으면 iOS 개발자에게 Kotlin 을 부족 역량으로 요구하게 된다.
type SkillGroup = { label: string; skills: string[] };
const GROUPS = groupsRaw as Record<string, SkillGroup>;
const GROUP_OF = new Map<string, string>();     // skillId -> groupKey
const GROUP_LABEL = new Map<string, string>();
{
  const idByName = new Map(SKILLS.map((s) => [s.name, s.id]));
  for (const [key, g] of Object.entries(GROUPS)) {
    GROUP_LABEL.set(key, g.label);
    for (const n of g.skills) {
      const id = idByName.get(n);
      if (id) GROUP_OF.set(id, key);
    }
  }
}
export const groupLabelOf = (key: string) => GROUP_LABEL.get(key);
export const groupOf = (skillId: string) => GROUP_OF.get(skillId);



/** 이 직무와 인접한 직무들 (유사도 내림차순). cross 를 주면 직군이 다른 것만. */
export function neighborsOf(jobId: string, opts?: { crossFamilyOnly?: boolean }) {
  return ADJACENCY
    .filter((e) => (e.a === jobId || e.b === jobId)
      && (!opts?.crossFamilyOnly || e.crossFamily))
    .map((e) => ({ jobId: e.a === jobId ? e.b : e.a, similarity: e.similarity, shared: e.shared }))
    .sort((x, y) => y.similarity - x.similarity);
}

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
/** 변별력 상한. 표본이 작은 직무에서 lift 가 10배 넘게 튀어 순위를 뒤집는 것을 막는다. */
const LIFT_CAP = 3;

/** 필수로 삼는 문턱 — 그 직무 최고 강도 대비. 개수를 고정하지 않기 위한 값이다. */
const MUST_REL = 0.4;
const MUST_MIN = 3, MUST_MAX = 8, NICE_MAX = 6;

export function requirementsOf(jobId: string) {
  //  ⚠️ "상위 5개 자르기"를 쓰지 않는다.
  //
  //  그렇게 하면 어느 직무든 필수가 정확히 5개가 된다. 정의가 넓은 직무는 그 5칸이
  //  범용 스택으로 채워져 **남의 직무 사람까지 흡수**한다.
  //  실측 — 독립 표본(설문 4,878건)에서 자주 틀리는 8개 방향이 전부 '→ 풀스택 개발자'였다.
  //         풀스택 필수가 TypeScript·React·JavaScript·Node.js·Docker 라 웹 개발자면 다 채운다.
  //
  //  대신 **출처가 뭐라고 말했는지**(tier)와 **얼마나 여러 곳이 말했는지**(importance)로 고른다.
  //    필수 = 자격요건 절 · 해설 글의 "필수·기본기" 대목 · 공인 체계가 가리킨 것
  //    우대 = 우대사항 절 · 해설 글의 "있으면 좋다·가산점" 대목
  //  개수는 직무마다 다르게 나온다 — 근거가 있는 만큼만 요구한다.
  const rows = MATRIX.filter((r) => r.jobId === jobId);
  if (!rows.length) return { must: [], nice: [] };

  //  ⚠️ 변별력(lift)을 곱한다. 재설계하면서 이 곱을 잃어버렸더니
  //     모바일 개발자 필수에 React(lift 0.65 — 그 직무에서 평균 이하)가 올라오고,
  //     임베디드의 RTOS(lift 157)·C++(lift 11.7)는 우대로 밀렸다.
  //     강도만 보면 어느 직무에서나 범용 도구가 위로 온다. 그것을 막으려고 lift 를 쓴다.
  const imp = (r: MatrixRow) =>
    (r.importance ?? r.evidence ?? r.weight) * Math.min(LIFT_CAP, r.lift ?? 1);
  const top = Math.max(...rows.map(imp), 0) || 1;
  const byImp = [...rows].sort((a, b) => imp(b) - imp(a));

  //  pinned = 사람이 점검판에서 '필수'라고 못 박은 줄. 강도 문턱을 타지 않는다.
  //  실제로 임베디드의 RTOS 를 필수로 지정했는데 강도가 문턱에 조금 못 미쳐 안 나왔다.
  //  손으로 고치는 의미가 없어지므로 앞에 세운다.
  let must = byImp.filter((r) => r.tier === 'required'
    && (r.pinned || imp(r) >= top * MUST_REL));
  if (must.length < MUST_MIN) must = byImp.slice(0, MUST_MIN);       // 근거가 얇은 직무 보호
  must = [...must].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, MUST_MAX);

  const mustSet = new Set(must.map((r) => r.skillId));
  const nice = byImp
    .filter((r) => !mustSet.has(r.skillId) && (r.tier === 'preferred' || imp(r) >= top * 0.2))
    .slice(0, NICE_MAX);

  return { must: must.map((r) => r.skillId), nice: nice.map((r) => r.skillId) };
}

/** 그 직무가 그 역량을 요구하는 공고 비율. 충족률의 무게로 쓴다. */
const DEMAND = new Map<string, number>(
  MATRIX.map((r) => [`${r.jobId}|${r.skillId}`, r.weight] as const)
);
export const demandOf = (jobId: string, skillId: string) =>
  DEMAND.get(`${jobId}|${skillId}`) ?? 0;

// ── 직무 자체의 성격 보정 ────────────────────────────────────────────
//
//  정의가 넓은 직무는 남의 직무 사람까지 흡수한다.
//  실측 — 독립 표본(설문 3,404건)에서 자주 틀리는 방향이 거의 전부 '→ 풀스택 개발자'였다.
//  풀스택은 정의상 프론트+백엔드의 합집합이라 웹 개발자면 누구나 요구를 상당수 채운다.
//
//  두 가지로 보정한다. 실측으로 골랐다 (같은 표본, 같은 조건).
//      현재      1위 28.6%  3위 안 51.6%
//      고유성만   1위 30.3%  3위 안 53.6%
//      포함만     1위 30.1%  3위 안 52.7%
//      둘 다     1위 31.2%  3위 안 53.8%   ← 채택. 효과가 거의 더해진다 = 서로 다른 것을 잡는다
//
//  ⚠️ 포함은 **방향**이 있어야 한다. 단순히 "남과 겹치는 비율"로 재면
//     프론트엔드(100%)가 풀스택(83%)보다 포함형으로 나와 거꾸로다.
//     "다른 **한** 직무의 필수+우대에 얼마나 통째로 흡수되는가"로 재야 맞다.
const UNIQ_FLOOR = 0.6;       // 고유성이 0이어도 이만큼은 남긴다
const CONT_PENALTY = 0.35;

const JOB_ADJUST = new Map<string, number>();
{
  const reqs = new Map(JOBS.map((j) => [j.id, requirementsOf(j.id)]));
  const inMust = new Map<string, number>();
  for (const [, r] of reqs) {
    for (const s of r.must) inMust.set(s, (inMust.get(s) ?? 0) + 1);
  }
  //  ⚠️ 필수가 적은 직무는 고유성·흡수율이 둘 다 극단으로 튄다.
  //     실측: 데이터 분석가(필수 SQL·BI·Python 3개)가 고유성 0.24 · 흡수율 1.00 을 받아
  //     보정 0.44 가 됐다. 보정 전 83점이 36점으로 떨어져 5년차 데이터 분석가에게
  //     데이터 분석가가 3순위 안에도 안 나왔다.
  //     넓은 직무를 누르려던 보정이 **얇고 정확한 직무**를 누른 것이다.
  //     그래서 표본이 얇을수록 평균(0.5) 쪽으로 당긴다 — 축소 추정.
  const SHRINK_K = 3;
  const shrink = (v: number, n: number) => (v * n + 0.5 * SHRINK_K) / (n + SHRINK_K);

  const uniq = new Map<string, number>();
  for (const [jid, r] of reqs) {
    const raw = r.must.length
      ? r.must.reduce((a, s) => a + 1 / (inMust.get(s) || 1), 0) / r.must.length
      : 0;
    uniq.set(jid, r.must.length ? shrink(raw, r.must.length) : 0);
  }
  const vals = [...uniq.values()];
  const lo = Math.min(...vals), hi = Math.max(...vals);

  for (const [jid, r] of reqs) {
    //  ⚠️ 흡수율을 **개수**로 재면 안 된다. 흔한 것 3개뿐인 직무는 그 셋이 남에게
    //     들어가는 순간 1.00 이 되어 '완전히 흡수된 직무' 로 잡힌다. 무게로 잰다.
    let contained = 0;
    const totalW = r.must.reduce((a, s) => a + demandOf(jid, s), 0);
    for (const [other, o] of reqs) {
      if (other === jid || !r.must.length || !totalW) continue;
      const cover = new Set([...o.must, ...o.nice]);
      const w = r.must.reduce((a, s) => a + (cover.has(s) ? demandOf(jid, s) : 0), 0);
      contained = Math.max(contained, w / totalW);
    }
    contained = r.must.length ? shrink(contained, r.must.length) : contained;
    const u = hi > lo ? ((uniq.get(jid) ?? 0) - lo) / (hi - lo) : 0.5;
    JOB_ADJUST.set(jid, (UNIQ_FLOOR + (1 - UNIQ_FLOOR) * u) * (1 - CONT_PENALTY * contained));
  }
  //  이 보정은 **직무끼리 견주는 데** 쓰는 값이다. 그대로 곱하면 모든 점수가 내려가
  //  화면의 적합도가 통째로 낮아진다(iOS 8년차 67 → 41). 순위는 같은데 숫자만 나빠 보인다.
  //  가장 높은 직무가 1.0 이 되도록 되돌린다 — 순위는 그대로고 눈금만 살아난다.
  const mx = Math.max(...JOB_ADJUST.values(), 0) || 1;
  for (const [k, v] of JOB_ADJUST) JOB_ADJUST.set(k, v / mx);
}
/** 그 직무가 얼마나 '그 직무다운가'. 넓고 남에게 흡수되는 직무일수록 낮다. */
export const jobAdjustOf = (jobId: string) => JOB_ADJUST.get(jobId) ?? 1;

// ── 같은 기술을 가진 사람들은 실제로 어떤 직무를 하나 ──────────────────
//
//  「이 길도 있어요」의 근거로만 쓴다. 주 순위에는 쓰지 않는다.
//  응답자가 Stack Overflow 커뮤니티라 서구 비중이 높다 — 국내 시장과 다를 수 있다.
//  다만 "몰랐던 길"을 보여주는 자리에서는 그 편중이 단점이 덜하다.
//  국내 공고에 없는 경로가 나오면 그건 정보지 오류가 아니다. (이슈 #14)
//
//  ⚠️ 날 확률을 그대로 쓰면 안 된다. 응답자의 43%가 풀스택이라 어떤 기술을 넣어도
//     풀스택이 1위가 된다. **기저 대비 배수(lift)** 로 봐야 한다.
type PeerTable = {
  respondents: number;
  jobs: Record<string, number>;
  skills: Record<string, { n: number; jobs: Record<string, number> }>;
};
const PEER = peerRaw as PeerTable;
const PEER_BASE: Record<string, number> = Object.fromEntries(
  Object.entries(PEER.jobs).map(([j, c]) => [j, c / PEER.respondents])
);

export type PeerPath = { jobId: string; lift: number; viaSkillId: string; share: number; n: number };

/** 이 역량 묶음을 가진 사람들이 실제로 하는 직무 — 기저 대비 배수 순 */
export function peerPathsOf(have: Set<string>): PeerPath[] {
  const ids = [...have].filter((id) => PEER.skills[id]);
  if (ids.length < 2) return [];
  const score: Record<string, number> = {};
  for (const j of Object.keys(PEER_BASE)) {
    let lp = 0;
    for (const id of ids) {
      const p = PEER.skills[id].jobs[j] ?? 0.0005;   // 한 번도 안 나온 조합에도 바닥값
      lp += Math.log(p / PEER_BASE[j]);
    }
    score[j] = Math.exp(lp / ids.length);            // 역량 수로 나눠 길이에 안 휘둘리게
  }
  return Object.entries(score)
    .map(([jobId, lift]) => {
      //  근거로 보여줄 역량 하나 — 이 직무를 가장 강하게 가리키는 것
      const via = ids.reduce((a, b) =>
        (PEER.skills[b].jobs[jobId] ?? 0) / PEER_BASE[jobId]
        > (PEER.skills[a].jobs[jobId] ?? 0) / PEER_BASE[jobId] ? b : a);
      return { jobId, lift, viaSkillId: via,
               share: PEER.skills[via].jobs[jobId] ?? 0, n: PEER.skills[via].n };
    })
    .sort((a, b) => b.lift - a.lift);
}

/**
 * 요구 역량 중 **채워진 것**. 택일 관계를 여기서 푼다.
 *
 * 묶어서 한 칸으로 세는 방식은 실패했다 — 모바일 개발자의 Android·Kotlin·iOS·Swift 를
 * 한 칸으로 압축했더니, 그 사람의 강점이 한 칸으로 줄어들고 대신 UX/UI·MVVM 이
 * 상대적으로 커져서 8년차 iOS 개발자에게 모바일 개발자가 아예 순위에서 사라졌다.
 *
 * 그래서 칸은 그대로 두고 **대체 가능한 것만 면제**한다.
 *   iOS 개발자가 Android 계열 요구를 만족한 것으로 본다 — 같은 '모바일 플랫폼' 묶음이고
 *   그 사람이 그 묶음의 다른 것(iOS·Swift)을 이미 갖고 있기 때문이다.
 *   Kotlin 이 없는 것은 결함이 아니라 다른 길을 간 것이다.
 */
/**
 * LLM 이 적어 준 현재 직무명을 우리 직무 id 로 맞춘다.
 *
 * 왜 필요한가
 *   「이 길도 있어요」가 **지금 하고 있는 그 직무**에 붙는 일이 있었다.
 *   7년차 프로덕트 매니저에게 "프로덕트 매니저는 몰랐던 길입니다" 라고 말한 것이다.
 *   기존 가드는 점수 1위(scored[0])와 비교했는데, 점수 1위는 현재 직무가 아니다.
 *
 * ⚠️ 못 찾으면 undefined 를 돌려준다. 억지로 맞추면 엉뚱한 직무를 현재 직무로 보게 된다.
 */
const JOB_BY_NAME = new Map<string, string>();
{
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  for (const j of JOBS) {
    JOB_BY_NAME.set(norm(j.title), j.id);
    for (const a of j.aliases ?? []) JOB_BY_NAME.set(norm(a), j.id);
  }
}
export function resolveJobTitle(title?: string | null): string | undefined {
  if (!title) return undefined;
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  const k = norm(title);
  if (!k) return undefined;
  const exact = JOB_BY_NAME.get(k);
  if (exact) return exact;
  //  '인프라 엔지니어' 처럼 우리 이름과 다르게 적히는 경우 — 부분 일치로 한 번 더 본다
  let best: { id: string; len: number } | undefined;
  for (const [name, id] of JOB_BY_NAME) {
    if (name.length >= 3 && (k.includes(name) || name.includes(k))) {
      if (!best || name.length > best.len) best = { id, len: name.length };
    }
  }
  return best?.id;
}

/**
 * 충족률 — **칸을 세지 않고 무게를 더한다.**
 *
 *  왜 바꿨나. 칸을 세면 세 가지가 함께 망가진다.
 *    ① 택일 묶음이 칸을 부풀린다. 프론트엔드 필수 8개 중 셋(React·Angular·Vue)이 한 묶음이라
 *       Angular 하나만 가진 사람이 **세 칸**을 채웠다. 역량 2개로 4/8 = 0.50 을 받는다.
 *       목록에서 Angular·Vue 를 빼면 그 공짜 칸이 사라져 2/6 = 0.33 으로 떨어진다 —
 *       사람은 그대로인데 목록을 다듬었다고 점수가 변한다.
 *    ② 분모가 줄면 한 칸의 무게가 커진다. 8개면 12.5%p, 6개면 16.7%p.
 *    ③ 모든 칸의 무게가 같다. React(공고 69%)와 CSS(20%)가 똑같이 한 칸이었다.
 *
 *  ⚠️ 일정한 배율로는 못 고친다. 실측: 목록을 8→6 으로 줄였을 때 사람마다
 *     충족률이 0.44배~1.33배로 흩어졌다. 어떤 사람은 오히려 올랐다.
 *  ⚠️ 직무별 백분위로 보정해도 안 된다. 차이의 크기를 버려서 1위 31.1%→22.6% 로 내렸다.
 *
 *  무게는 **그 직무 공고의 요구 비율**을 쓴다. 강도(=비율×lift)는 lift 상한 3 에 눌려
 *  94% 짜리와 50% 짜리가 같은 무게가 된다(모바일의 Android 3.000 · UX/UI 2.826).
 *  같은 택일 묶음은 그 묶음에서 가장 무거운 것 하나로만 센다.
 *
 *  실측 (설문 3,391명) — 1위 31.1% → 32.3% · 3위 안 55.1% → 55.8%
 */
//  택일 묶음 대체 인정의 문턱.
//
//  묶음만 보고 대체를 인정하면 **그 직무가 거의 요구하지 않는 것으로 핵심 요구를 채운다.**
//  실측 — Java·Spring 백엔드 5년차에게 데이터 사이언티스트가 45점으로 2위였다.
//  서버 언어 묶음(Java·Python·C#…) 때문에 Java 보유자가 DS 의 Python(무게 0.81)을
//  대체 인정으로 채운 것이다. 그런데 DS 에서 Java 의 무게는 0.19 다.
//  DS 의 Python 은 언어가 아니라 pandas·sklearn 생태계이고, Java 로 바꿔 낄 수 없다.
//
//  그래서 **그 직무 안에서의 요구 무게**로 건다 — 내가 가진 동료가 빠진 것의
//  절반만큼은 요구되어야 대체로 본다. 이러면
//    · 모바일 개발자의 iOS(0.56) ↔ Android(0.50) 는 그대로 대체된다
//    · 백엔드의 Java ↔ Python 도 그대로다
//    · DS 의 Python(0.81) 을 Java(0.19) 로 채우는 것은 막힌다
//  실측 — 설문 3,420건. 채점기(eval_routes.py)에 같은 계산을 넣고 쓸었다.
//    0   (묶음만 봄 · 예전)  1위 32.0%  3위 안 56.9%
//    0.3                   1위 32.3%  3위 안 57.2%
//    0.5                   1위 32.4%  3위 안 57.5%   ← 채택
//    0.7                   1위 31.9%  3위 안 57.3%
//  ⚠️ 채점기에도 같은 값이 있다. 한쪽만 고치면 채점이 어긋난다.
const SUB_MIN_RATIO = 0.5;

/** 빠진 요구를 같은 묶음의 보유 역량으로 채운 것으로 볼 수 있나 */
export function substitutable(jobId: string, missing: string, have: Set<string>): boolean {
  const g = GROUP_OF.get(missing);
  if (!g) return false;
  //  ⚠️ 그 묶음의 무언가를 **실제로 갖고 있어야** 한다. 이 줄이 없으면
  //     아무것도 안 가진 사람도 무게 0 끼리 비교돼 통과한다(문턱 0 에서 1위 32%→25%).
  let held = false;
  let best = 0;
  for (const h of have) {
    if (GROUP_OF.get(h) !== g) continue;
    held = true;
    best = Math.max(best, demandOf(jobId, h));
  }
  if (!held) return false;
  return best >= SUB_MIN_RATIO * demandOf(jobId, missing);
}

export function coverage(jobId: string, required: string[], have: Set<string>): number {
  if (!required.length) return 0;
  const okGroups = new Set<string>();
  for (const id of have) {
    const g = GROUP_OF.get(id);
    if (g) okGroups.add(g);
  }
  //  묶음은 한 칸으로 접는다 — 무게는 그 묶음에서 가장 무거운 것
  const slots: { members: string[]; w: number }[] = [];
  const slotOfGroup = new Map<string, number>();
  for (const id of required) {
    const w = demandOf(jobId, id);
    const g = GROUP_OF.get(id);
    if (!g) { slots.push({ members: [id], w }); continue; }
    const at = slotOfGroup.get(g);
    if (at === undefined) {
      slotOfGroup.set(g, slots.length);
      slots.push({ members: [id], w });
    } else {
      slots[at].members.push(id);
      slots[at].w = Math.max(slots[at].w, w);
    }
  }
  const total = slots.reduce((a, s) => a + s.w, 0);
  if (!total) return 0;
  let got = 0;
  for (const s of slots) {
    const ok = s.members.some((id) => have.has(id) || substitutable(jobId, id, have));
    if (ok) got += s.w;
  }
  return got / total;
}

export function satisfied(required: string[], have: Set<string>, jobId?: string) {
  const hit: string[] = [];       // 실제로 가진 것 (화면에 보여줄 것)
  const covered: string[] = [];   // 채워진 것으로 치는 요구 (점수 분자)
  for (const id of required) {
    if (have.has(id)) { hit.push(id); covered.push(id); continue; }
    //  jobId 가 없으면 예전처럼 묶음만 본다 — 직무를 모르면 무게를 볼 수 없다.
    if (jobId ? substitutable(jobId, id, have) : sameGroupHeld(id, have)) covered.push(id);
  }
  return { hit, covered };
}

/** 같은 묶음의 무엇이든 갖고 있나 (직무를 모를 때 쓰는 옛 규칙) */
function sameGroupHeld(missing: string, have: Set<string>): boolean {
  const g = GROUP_OF.get(missing);
  if (!g) return false;
  for (const h of have) if (GROUP_OF.get(h) === g) return true;
  return false;
}

/** 이 직무가 그 스킬의 수요에서 차지하는 몫. iOS·Swift 처럼 한 직무에 몰린 스킬은 1에 가깝다. */
const CLAIM = new Map<string, number>();
{
  const bySkill = new Map<string, MatrixRow[]>();
  for (const r of MATRIX) {
    if (!bySkill.has(r.skillId)) bySkill.set(r.skillId, []);
    bySkill.get(r.skillId)!.push(r);
  }
  for (const [, rows] of bySkill) {
    const tot = rows.reduce((a, r) => a + r.weight, 0) || 1;
    for (const r of rows) CLAIM.set(`${r.jobId}|${r.skillId}`, r.weight / tot);
  }
}
export const claimOf = (jobId: string, skillId: string) => CLAIM.get(`${jobId}|${skillId}`) ?? 0;

/** 표본이 작은 직무는 요구 역량 자체를 믿기 어렵다. 20건이면 1.0, 7건이면 0.59. */
export const CONFIDENCE_N = 20;
export const confidenceOf = (jobId: string) =>
  Math.min(1, Math.sqrt((jobById.get(jobId)?.sampleSize ?? 0) / CONFIDENCE_N));

/** 직군을 넘나드는 역량 — 2개 이상 직군의 직무가 요구한다.
 *
 *  "이 길도 있어요"의 근거다. Swift·React 는 개발 직군에만 나오지만
 *  요구사항 정의·지표 설계·UX/UI 는 개발·기획·디자인에 모두 나온다.
 *  spread(전이성)로 대신 재면 안 된다 — 사용자 인터뷰·정보 구조 설계처럼
 *  직무 수가 적어 spread 는 낮은데 직군은 건너뛰는 역량을 놓친다.
 */
const CROSS_FAMILY = new Set<string>();
{
  const fams = new Map<string, Set<string>>();
  for (const r of MATRIX) {
    const f = jobById.get(r.jobId)?.family;
    if (!f) continue;
    if (!fams.has(r.skillId)) fams.set(r.skillId, new Set());
    fams.get(r.skillId)!.add(f);
  }
  for (const [id, f] of fams) if (f.size >= 2) CROSS_FAMILY.add(id);
}
export const isCrossFamilySkill = (id: string) => CROSS_FAMILY.has(id);

// ── 1단계: 이력서에서 후보를 **빠짐없이** 찾아낸다 ──────────────────────
//
//  왜 코드가 먼저 하나
//    LLM 하나에게 '누락 방지'와 '의미 판단'을 동시에 시키면 둘 다 놓친다.
//    실측 — 나열형 이력서에서 iOS 를 빠뜨렸다. 상위 모델로 바꿔도 이번엔 Swift 를 빠뜨렸다.
//    사전에 있는 이름을 원문에서 찾는 일은 판단이 아니라 대조다. 코드가 하면 절대 빠뜨리지 않는다.
//
//  판단은 하지 않는다 — 남의 얘기인지, 희망사항인지, 회사 소개인지는 2단계에서 LLM 이 본다.
const LOOKUP_PATTERNS: { id: string; name: string; re: RegExp }[] = [];
{
  const seen = new Set<string>();
  for (const s of SKILLS) {
    for (const t of [s.name, ...(s.aliases ?? [])]) {
      const k = `${s.id}|${t.toLowerCase()}`;
      if (t.length < 2 || seen.has(k)) continue;
      seen.add(k);
      //  낱말 경계. 부분 문자열로 찾으면 community 안의 unity 가 잡힌다.
      //  한글은 조사가 붙으므로 오른쪽을 조사·어미로만 연다.
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      //  대소문자 — 이력서는 "Language  swift, java, python" 처럼 소문자로 적는 일이 흔하다.
      //  코퍼스 채굴 때는 대소문자를 구분해야 했지만(소문자 sass 가 Sass 로 20건 오탐),
      //  여기는 사람이 쓴 짧은 글이고 **2단계에서 LLM 이 걸러 준다.** 넓게 잡는 편이 맞다.
      //  SQL/AWS/iOS 같은 3글자 기술도 소문자로 자주 적혀 대소문자를 무시한다.
      //  Go/BI/TS 같은 2글자는 일반 단어 오탐을 피하려고 대소문자를 구분한다.
      const flags = t.length >= 3 ? 'ui' : 'u';
      LOOKUP_PATTERNS.push({
        id: s.id, name: s.name,
        re: new RegExp(
          `(?<![A-Za-z0-9가-힣])${esc}(?![A-Za-z0-9])(?:(?=[^가-힣])|(?=[을를이가은는의에도와과로으써만부터까지등및입였])|$)`,
          flags),
      });
    }
  }
}

export type Mention = { id: string; name: string; matched: string; context: string };

/** 이력서에서 사전에 있는 역량 이름을 전부 찾는다. 순서는 원문 등장 순. */
export function findMentions(text: string, maxContext = 60): Mention[] {
  const out = new Map<string, Mention>();
  for (const { id, name, re } of LOOKUP_PATTERNS) {
    if (out.has(id)) continue;
    const m = re.exec(text);
    if (!m || m.index === undefined) continue;
    const a = Math.max(0, m.index - maxContext);
    const b = Math.min(text.length, m.index + m[0].length + maxContext);
    out.set(id, { id, name, matched: m[0], context: text.slice(a, b).replace(/\s+/g, ' ').trim() });
  }
  return [...out.values()];
}

export const getSkill = (id: string) => skillById.get(id);
export const getJob = (id: string) => jobById.get(id);
