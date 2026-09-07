import { JOBS, MATRIX, getSkill, requirementsOf, type SkillRow } from '@/lib/skill-index';
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
 *   work_skill  요구사항 정의 · 지표 설계 · 이해관계자 조율   (수동 보강 17개)
 *   skill_ko    데이터 분석 · 전략 기획 · 로그 분석          (공고에서 뽑은 한국어 업무)
 *   나머지       도구 · 언어 · 오피스 · 도메인 · 기술개념 · 자격증
 */
const WORK_SOURCE_TYPES = new Set(['work_skill', 'skill_ko']);

export function kindOf(skill: SkillRow | undefined): ReqKind {
  const st = (skill as { sourceType?: string } | undefined)?.sourceType;
  return st && WORK_SOURCE_TYPES.has(st) ? 'work' : 'tool';
}

export interface RequirementRow {
  skillId: string;
  name: string;
  kind: ReqKind;
  /** 필수(상위 N개)인가 */
  isMust: boolean;
  /** 이 직무 공고 중 이 역량이 등장한 건수 */
  docFreq: number;
  held: boolean;
  /** 보유 시 — 이력서에서 이 역량을 찾은 문장 */
  evidence?: string;
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
  work: RequirementRow[];
  tools: RequirementRow[];
  mustHeld: number;
  mustTotal: number;
  niceHeld: number;
  niceTotal: number;
}

const byTitle = new Map(JOBS.map((j) => [j.title, j]));

/** 이력서에서 뽑힌 스킬 → 이름·근거 색인. 표기 흔들림은 이미 흡수된 상태로 들어온다 */
function heldIndex(skills: Skill[]) {
  const m = new Map<string, string>();
  for (const s of skills) m.set(s.name, s.evidence);
  return m;
}

/** 한 칸에 너무 많이 쌓이지 않게 자른다 */
const MAX_PER_COLUMN = 8;

export function jobDetailOf(destination: string, mySkills: Skill[]): JobDetail | null {
  const job = byTitle.get(destination);
  if (!job) return null;

  const held = heldIndex(mySkills);
  const { must, nice } = requirementsOf(job.id);
  const mustSet = new Set(must);
  const niceSet = new Set(nice);

  const rows: RequirementRow[] = [];
  for (const r of MATRIX) {
    if (r.jobId !== job.id) continue;
    const skill = getSkill(r.skillId);
    if (!skill) continue;
    const evidence = held.get(skill.name);
    rows.push({
      skillId: r.skillId,
      name: skill.name,
      kind: kindOf(skill),
      isMust: mustSet.has(r.skillId),
      docFreq: r.docFreq ?? 0,
      held: evidence !== undefined,
      evidence,
      firstStep: evidence === undefined ? skill.firstStep : undefined,
    });
  }

  // 필수를 위로, 그 안에서는 등장 건수 순
  const order = (a: RequirementRow, b: RequirementRow) =>
    Number(b.isMust) - Number(a.isMust) || b.docFreq - a.docFreq;

  const countHeld = (ids: Set<string>) =>
    rows.filter((r) => ids.has(r.skillId) && r.held).length;

  return {
    jobId: job.id,
    title: job.title,
    family: job.family,
    oneLiner: ONE_LINERS[job.id] ?? '',
    sampleSize: job.sampleSize,
    work: rows.filter((r) => r.kind === 'work').sort(order).slice(0, MAX_PER_COLUMN),
    tools: rows.filter((r) => r.kind === 'tool').sort(order).slice(0, MAX_PER_COLUMN),
    mustHeld: countHeld(mustSet),
    mustTotal: must.length,
    niceHeld: countHeld(niceSet),
    niceTotal: nice.length,
  };
}
