import {
  JOBS,
  MATRIX,
  getSkill,
  requirementsOf,
  satisfied,
  confidenceOf,
  groupOf,
  groupLabelOf,
  type SkillRow,
} from '@/lib/skill-index';
import oneLinersRaw from '@/data/job-oneliners.json';
import type { Skill } from '@/types';

// ============================================================================
//  직무 상세 — "이 직무에 필요한 것"을 화면이 그릴 수 있는 형태로 편다.
//
//  계산은 전부 매트릭스에서 파생된다. 새로 만드는 데이터는 한 줄 정의뿐이다.
//  Route 에는 jobId 가 없으므로 직무명(destination)으로 역추적한다.
//  types.ts(팀 계약)를 건드리지 않기 위한 선택이다.
// ============================================================================

const ONE_LINERS = oneLinersRaw as Record<string, string>;

/** 화면의 두 칸 — "무엇을 하는가" / "무엇을 쓰는가" */
export type ReqKind = 'work' | 'tool';

/**
 * sourceType 으로 가른다.
 *   work        요구사항 정의 · 지표 설계 · 이해관계자 조율   (수동 정의 17개)
 *   skill_ko    데이터 분석 · 전략기획 · 로그 분석            (공고에서 뽑은 한국어 업무)
 *   나머지       도구 · 언어 · 오피스 · 도메인 · 기술개념 · 자격증 · curated
 *
 * ⚠️ 'work_skill' 은 예전 값이다. 데이터 재산출로 'work' 가 되었는데,
 *    이 집합을 안 고쳤더니 업무 역량 17개가 통째로 도구 칸으로 넘어갔다.
 *    바깥에서 이름이 바뀌는 것을 코드가 못 느끼는 종류의 사고라 둘 다 남겨 둔다.
 */
const WORK_SOURCE_TYPES = new Set(['work', 'work_skill', 'skill_ko']);

export function kindOf(skill: SkillRow | undefined): ReqKind {
  const st = (skill as { sourceType?: string } | undefined)?.sourceType;
  return st && WORK_SOURCE_TYPES.has(st) ? 'work' : 'tool';
}

export interface RequirementRow {
  skillId: string;
  name: string;
  kind: ReqKind;
  /** 필수인가 — requirementsOf 가 근거(tier·강도)로 고른다. 개수는 직무마다 다르다 */
  isMust: boolean;
  /** 이 직무 공고 중 이 역량이 등장한 건수 */
  docFreq: number;
  held: boolean;
  /** 보유 시 — 이력서에서 이 역량을 찾은 문장 */
  evidence?: string;
  /** 직접 갖진 않았지만 같은 택일 묶음의 다른 것을 가진 경우 (iOS 개발자의 Kotlin) */
  coveredVia?: string;
  /** 미보유 시 — 첫 단계 한 문장 */
  firstStep?: string;
}

export interface JobDetail {
  jobId: string;
  title: string;
  family: string;
  oneLiner: string;
  /** 이 직무의 공고 표본 수 — 모든 docFreq 의 분모 */
  sampleSize: number;
  /** 표본이 얇으면 요구 역량 자체를 믿기 어렵다. 20건이면 1.0, 7건이면 0.59 */
  confidence: number;
  work: RequirementRow[];
  tools: RequirementRow[];
  mustHeld: number;
  mustTotal: number;
  niceHeld: number;
  niceTotal: number;
}

const byTitle = new Map(JOBS.map((j) => [j.title, j]));

/** 이력서에서 뽑힌 스킬 → 이름·근거 색인 */
function heldIndex(skills: Skill[]) {
  const m = new Map<string, string>();
  for (const s of skills) m.set(s.name, s.evidence);
  return m;
}

/** 한 칸에 너무 많이 쌓이지 않게 자른다 */
const MAX_PER_COLUMN = 8;

/** 표본이 이보다 얇으면 화면에 낮은 확신을 표시한다 */
export const LOW_CONFIDENCE = 0.8;

export function jobDetailOf(destination: string, mySkills: Skill[]): JobDetail | null {
  const job = byTitle.get(destination);
  if (!job) return null;

  const heldByName = heldIndex(mySkills);
  const { must, nice } = requirementsOf(job.id);
  const mustSet = new Set(must);
  const niceSet = new Set(nice);

  const jobRows = MATRIX.filter((r) => r.jobId === job.id);

  // 보유 판정에 skillId 집합이 필요하다 (이름 → id 는 getSkill 로 되돌린다)
  const haveIds = new Set<string>();
  for (const r of jobRows) {
    const s = getSkill(r.skillId);
    if (s && heldByName.has(s.name)) haveIds.add(r.skillId);
  }
  // 택일 관계 — iOS 개발자가 Kotlin 을 안 가진 것은 결함이 아니라 다른 길이다
  const coveredIds = new Set(satisfied([...mustSet, ...niceSet], haveIds).covered);

  const rows: RequirementRow[] = [];
  for (const r of jobRows) {
    const skill = getSkill(r.skillId);
    if (!skill) continue;
    const evidence = heldByName.get(skill.name);
    const held = evidence !== undefined;
    const substituted = !held && coveredIds.has(r.skillId);
    const groupKey = substituted ? groupOf(r.skillId) : undefined;
    rows.push({
      skillId: r.skillId,
      name: skill.name,
      kind: kindOf(skill),
      isMust: mustSet.has(r.skillId),
      docFreq: r.docFreq ?? 0,
      held,
      evidence,
      coveredVia: groupKey ? (groupLabelOf(groupKey) ?? undefined) : undefined,
      firstStep: held || substituted ? undefined : skill.firstStep,
    });
  }

  // 필수를 위로, 그 안에서는 등장 건수 순
  const order = (a: RequirementRow, b: RequirementRow) =>
    Number(b.isMust) - Number(a.isMust) || b.docFreq - a.docFreq;

  const countHeld = (ids: Set<string>) =>
    [...ids].filter((id) => coveredIds.has(id)).length;

  return {
    jobId: job.id,
    title: job.title,
    family: job.family,
    oneLiner: ONE_LINERS[job.id] ?? '',
    sampleSize: job.sampleSize,
    confidence: confidenceOf(job.id),
    work: rows.filter((r) => r.kind === 'work').sort(order).slice(0, MAX_PER_COLUMN),
    tools: rows.filter((r) => r.kind === 'tool').sort(order).slice(0, MAX_PER_COLUMN),
    mustHeld: countHeld(mustSet),
    mustTotal: must.length,
    niceHeld: countHeld(niceSet),
    niceTotal: nice.length,
  };
}
