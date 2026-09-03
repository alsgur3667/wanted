#!/usr/bin/env node
/**
 * 데이터 검증 스크립트 — 의존성 없음. node 만 있으면 돌아간다.
 *
 *   node scripts/validate-data.mjs data/jobs.json data/skills.json data/job-skills.json
 *
 * 통과해야 앱에 넣을 수 있다. 실패하면 무엇이 왜 틀렸는지 알려준다.
 */
import { readFileSync, existsSync } from 'node:fs';

const [jobsPath, skillsPath, matrixPath] = process.argv.slice(2);
if (!jobsPath || !skillsPath || !matrixPath) {
  console.error('사용법: node scripts/validate-data.mjs <jobs.json> <skills.json> <job-skills.json>');
  process.exit(1);
}

const errors = [];
const warns = [];
const E = (m) => errors.push(m);
const W = (m) => warns.push(m);

function load(p, label) {
  if (!existsSync(p)) { E(`${label}: 파일이 없습니다 → ${p}`); return null; }
  try {
    const j = JSON.parse(readFileSync(p, 'utf-8'));
    if (!Array.isArray(j)) { E(`${label}: 최상위가 배열이어야 합니다`); return null; }
    return j;
  } catch (e) { E(`${label}: JSON 파싱 실패 — ${e.message}`); return null; }
}

const ID_RE = /^[a-z0-9_]+$/;
const FAMILIES = ['개발', '디자인', '기획'];
const SKILL_TYPES = ['hard', 'tool', 'domain', 'soft'];
const SOURCES = ['JD', 'KNOW', 'NCS', 'manual'];

const jobs = load(jobsPath, 'jobs');
const skills = load(skillsPath, 'skills');
const matrix = load(matrixPath, 'job-skills');

// ---------- jobs ----------
const jobIds = new Set();
if (jobs) jobs.forEach((j, i) => {
  const at = `jobs[${i}]${j?.id ? ` (${j.id})` : ''}`;
  if (!j.id || !ID_RE.test(j.id)) E(`${at}: id 는 영소문자·숫자·밑줄만 (예: "fe_dev")`);
  if (jobIds.has(j.id)) E(`${at}: id 중복`);
  jobIds.add(j.id);
  if (!j.title?.trim()) E(`${at}: title 필수`);
  if (!FAMILIES.includes(j.family)) E(`${at}: family 는 ${FAMILIES.join(' | ')} 중 하나 (받은 값: ${j.family})`);
  if (!Array.isArray(j.aliases)) E(`${at}: aliases 는 배열 (없으면 [])`);
  if (typeof j.sampleSize !== 'number') E(`${at}: sampleSize(수집한 공고 수) 필수`);
  else if (j.sampleSize < 5) W(`${at}: 표본 ${j.sampleSize}건 — 5건 미만이면 통계가 흔들립니다`);
  if (j.source && !SOURCES.includes(j.source)) W(`${at}: source 는 ${SOURCES.join(' | ')} 권장`);
});

// ---------- skills ----------
const skillIds = new Set();
const nameSeen = new Map();
if (skills) skills.forEach((s, i) => {
  const at = `skills[${i}]${s?.id ? ` (${s.id})` : ''}`;
  if (!s.id || !ID_RE.test(s.id)) E(`${at}: id 는 영소문자·숫자·밑줄만`);
  if (skillIds.has(s.id)) E(`${at}: id 중복`);
  skillIds.add(s.id);
  if (!s.name?.trim()) E(`${at}: name 필수`);
  else {
    const key = s.name.replace(/\s/g, '').toLowerCase();
    if (nameSeen.has(key)) E(`${at}: name "${s.name}" 이 ${nameSeen.get(key)} 와 사실상 중복 — 한쪽을 aliases 로 합치세요`);
    else nameSeen.set(key, at);
  }
  if (!SKILL_TYPES.includes(s.type)) E(`${at}: type 은 ${SKILL_TYPES.join(' | ')} 중 하나`);
  if (!Array.isArray(s.aliases)) E(`${at}: aliases 는 배열 (없으면 [])`);
  if (typeof s.learnDifficulty !== 'number' || s.learnDifficulty < 0 || s.learnDifficulty > 1)
    E(`${at}: learnDifficulty 는 0~1 사이 숫자`);
  if (!s.firstStep?.trim()) W(`${at}: firstStep 이 비었습니다 — 화면에서 "무엇부터 하면 되는지"를 못 보여줍니다`);
});

// ---------- job-skills ----------
const pairSeen = new Set();
const perJob = new Map();
if (matrix) matrix.forEach((r, i) => {
  const at = `job-skills[${i}]`;
  if (!jobIds.has(r.jobId)) E(`${at}: jobId "${r.jobId}" 가 jobs 에 없습니다`);
  if (!skillIds.has(r.skillId)) E(`${at}: skillId "${r.skillId}" 가 skills 에 없습니다`);
  const key = `${r.jobId}|${r.skillId}`;
  if (pairSeen.has(key)) E(`${at}: (${r.jobId}, ${r.skillId}) 조합 중복`);
  pairSeen.add(key);
  if (typeof r.weight !== 'number' || r.weight < 0 || r.weight > 1)
    E(`${at}: weight 는 0~1 사이 숫자 (받은 값: ${r.weight})`);
  if (r.docFreq != null && typeof r.docFreq !== 'number') E(`${at}: docFreq 는 숫자`);
  perJob.set(r.jobId, (perJob.get(r.jobId) ?? 0) + 1);
});

// ---------- 앱이 돌아갈 최소 조건 ----------
for (const id of jobIds) {
  const n = perJob.get(id) ?? 0;
  if (n === 0) E(`직무 "${id}" 에 연결된 스킬이 0개 — 이 직무는 추천에 절대 안 나옵니다`);
  else if (n < 5) W(`직무 "${id}" 의 스킬이 ${n}개 — 최소 5개는 있어야 적합도가 의미 있습니다`);
}
const usedSkills = new Set([...pairSeen].map((k) => k.split('|')[1]));
const orphan = [...skillIds].filter((s) => !usedSkills.has(s));
if (orphan.length) W(`어느 직무에도 안 쓰인 스킬 ${orphan.length}개: ${orphan.slice(0, 8).join(', ')}${orphan.length > 8 ? ' …' : ''}`);

// ---------- 리포트 ----------
console.log('');
console.log(`직무 ${jobIds.size}개 · 스킬 ${skillIds.size}개 · 매핑 ${pairSeen.size}건`);
if (warns.length) {
  console.log(`\n경고 ${warns.length}건 (돌아가긴 함)`);
  warns.forEach((w) => console.log('  ! ' + w));
}
if (errors.length) {
  console.log(`\n오류 ${errors.length}건 — 고쳐야 앱에 넣을 수 있습니다`);
  errors.forEach((e) => console.log('  x ' + e));
  console.log('');
  process.exit(1);
}
console.log('\n통과. 이대로 앱에 넣을 수 있습니다.\n');
