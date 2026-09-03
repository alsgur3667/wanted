#!/usr/bin/env node
/**
 * 업무 역량 병합 스크립트
 *
 *   node scripts/add-work-skills.mjs <jobs.json> <skills.json> <job-skills.json> <work-skills.json> [출력폴더] [newcomer-ratio.json]
 *
 * 왜 스크립트로 만드나 —
 *   수집 파이프라인이 다시 돌면 원본 3개 파일이 통째로 교체된다.
 *   손으로 고쳐 넣으면 그때마다 날아가므로, 병합을 재실행 가능한 형태로 둔다.
 *
 * 원칙 —
 *   · 원본(source: "JD")은 건드리지 않는다. 추가만 한다.
 *   · 추가분은 source: "manual" 로 표시해 근거를 구분한다.
 *   · 이미 같은 이름/별칭의 스킬이 있으면 건너뛴다 (중복 방지)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const [jobsP, skillsP, matrixP, workP, outDir = '.', ratioP] = process.argv.slice(2);
if (!workP) {
  console.error('사용법: node add-work-skills.mjs <jobs> <skills> <job-skills> <work-skills> [출력폴더]');
  process.exit(1);
}
const read = (p) => JSON.parse(readFileSync(p, 'utf-8'));

const jobs = read(jobsP);
const skills = read(skillsP);
const matrix = read(matrixP);
const work = read(workP);

// 신입 채용 비율 — 실측값(공고 경력요건)이 있으면 그대로 두고, 없을 때만 추정치를 채운다
if (ratioP) {
  const { ratios } = read(ratioP);
  let filled = 0, kept = 0;
  for (const j of jobs) {
    if (typeof j.newcomerRatio === 'number') { kept++; continue; }
    if (ratios[j.id] !== undefined) {
      j.newcomerRatio = ratios[j.id];
      j.ratioSource = 'manual';
      filled++;
    }
  }
  console.log(`\n신입비율  실측 유지 ${kept} · 추정 보강 ${filled}`);
}

const jobIds = new Set(jobs.map((j) => j.id));
const norm = (s) => s.toLowerCase().replace(/[\s\-_./()]/g, '');

// 기존 스킬의 이름·별칭 색인 — 중복 추가를 막는다
const taken = new Map();
for (const s of skills) for (const t of [s.name, ...(s.aliases ?? [])]) taken.set(norm(t), s.id);

const addedSkills = [];
const idMap = new Map(); // work-skills 의 id -> 실제 사용할 skillId

for (const w of work.skills) {
  const hit = taken.get(norm(w.name));
  if (hit) {
    idMap.set(w.id, hit);          // 이미 있으면 그걸 재사용
    continue;
  }
  idMap.set(w.id, w.id);
  addedSkills.push({
    id: w.id,
    name: w.name,
    type: w.type,
    aliases: w.aliases ?? [],
    learnDifficulty: w.learnDifficulty,
    firstStep: w.firstStep,
    sourceType: 'work_skill',
    isCertification: false,
    onMap: true,
    firstStepSource: 'manual',
    difficultySource: 'manual',
  });
}

const pairSeen = new Set(matrix.map((r) => `${r.jobId}|${r.skillId}`));
const addedRows = [];
const warnings = [];

for (const [jobId, ws] of Object.entries(work.mapping)) {
  if (!jobIds.has(jobId)) { warnings.push(`jobs.json 에 없는 직무: ${jobId} — 건너뜀`); continue; }
  const job = jobs.find((j) => j.id === jobId);
  for (const [wid, weight] of Object.entries(ws)) {
    const skillId = idMap.get(wid);
    if (!skillId) { warnings.push(`work-skills 에 없는 스킬: ${wid}`); continue; }
    const key = `${jobId}|${skillId}`;
    if (pairSeen.has(key)) { warnings.push(`이미 존재: ${jobId} × ${skillId} — 원본 유지`); continue; }
    pairSeen.add(key);
    addedRows.push({
      jobId, skillId, weight,
      docFreq: Math.round(weight * job.sampleSize),
      source: 'manual',                    // ★ 근거 구분
      requirement: weight >= 0.6 ? 'required' : 'preferred',
    });
  }
}

const outSkills = [...skills, ...addedSkills];
const outMatrix = [...matrix, ...addedRows];

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, basename(jobsP)), JSON.stringify(jobs, null, 2), 'utf-8');
writeFileSync(join(outDir, basename(skillsP)), JSON.stringify(outSkills, null, 2), 'utf-8');
writeFileSync(join(outDir, basename(matrixP)), JSON.stringify(outMatrix, null, 2), 'utf-8');

console.log(`\n스킬  ${skills.length} → ${outSkills.length}  (추가 ${addedSkills.length})`);
console.log(`매핑  ${matrix.length} → ${outMatrix.length}  (추가 ${addedRows.length})`);
if (warnings.length) {
  console.log(`\n참고 ${warnings.length}건`);
  warnings.slice(0, 10).forEach((w) => console.log('  · ' + w));
}
console.log(`\n출력: ${outDir}\n`);
