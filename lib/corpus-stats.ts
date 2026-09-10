import jobs from '@/data/jobs.json';
import skills from '@/data/skills.json';
import jobSkills from '@/data/job-skills.json';

// ============================================================================
//  데이터 규모 — 화면에 쓰는 숫자
//
//  ⚠️ 이 값을 손으로 적어 두지 않는다. 데이터가 늘거나 줄었는데 화면만 옛날
//     숫자로 남으면, 심사에서 "1,435건이라면서요" 한 마디에 신뢰가 통째로
//     흔들린다. 파일에서 직접 세면 그럴 일이 없다.
//
//  ⚠️ '역량'은 사전에 등재된 298개가 아니라 실제로 직무에 붙은 255개를 센다.
//     사전에만 있고 어느 직무에도 안 쓰인 것을 규모로 자랑하면 부풀리기다.
//
//  전부 정적 JSON 이라 빌드 때 한 번 계산되고 런타임 비용이 없다.
// ============================================================================

const usedSkillIds = new Set(jobSkills.map((row) => row.skillId));

export const CORPUS = {
  /** 분석한 채용공고 수 — 직무별 표본 수를 합한 값 */
  postings: jobs.reduce((sum, job) => sum + (job.sampleSize ?? 0), 0),
  /** 직무 수 */
  jobs: jobs.length,
  /** 실제로 어느 직무엔가 붙은 역량 수 */
  skills: usedSkillIds.size,
  /** 직무 × 역량 연결 수 */
  pairs: jobSkills.length,
  /** 사전에 등재된 역량 수. 규모 표기에는 쓰지 않는다 */
  skillDictionary: skills.length,
} as const;
