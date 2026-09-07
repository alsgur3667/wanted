import { EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt, buildMentionSection, buildVocabularySection } from '@/lib/prompts/extract';
import { extractCareerMonths } from '@/lib/career';
import { JOBS, MATRIX, SKILLS, findMentions, resolveJobTitle } from '@/lib/skill-index';

// ============================================================================
//  LLM 제공자 추상화
//  환경변수 LLM_PROVIDER 로 전환한다. 코드는 그대로 두고 키만 바꾸면 된다.
//    gemini    무료 티어 (기본) — 카드 등록 불필요
//    anthropic 유료 — 무료 티어가 부족할 때
//    mock      키 없이 파이프라인 관통 확인용
// ============================================================================

export type Provider = 'gemini' | 'anthropic' | 'mock';

export interface Extracted {
  currentPosition: {
    jobTitle: string; jobFamily: string; careerMonths: number;
    industry: string | null; summary: string;
  };
  skillCandidates: { name: string; evidenceText: string; evidenceMonths?: number; isQuantified?: boolean }[];
}

// 어느 직무에도 연결되지 않은 스킬은 추천에 쓰이지 않으므로 어휘에서 제외한다
const USED_SKILL_IDS = new Set(MATRIX.map((r) => r.skillId));
const VOCABULARY = buildVocabularySection(
  SKILLS.filter((s) => USED_SKILL_IDS.has(s.id)).map((s) => s.name)
);

/**
 * 환경변수는 반드시 정리해서 쓴다.
 * 메모장으로 .env.local 을 편집하면 따옴표·공백·개행이 섞여 들어가고,
 * 그대로 URL 에 붙으면 모델을 못 찾아 404 가 난다. 원인 찾기 어려운 유형의 사고다.
 */
function env(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const cleaned = v.trim().replace(/^["']|["']$/g, '').trim();
  return cleaned || undefined;
}

export function activeProvider(): Provider {
  const configured = env('LLM_PROVIDER');
  if (configured && !['gemini', 'anthropic', 'mock'].includes(configured)) {
    throw new Error(`지원하지 않는 LLM_PROVIDER입니다: ${configured}`);
  }
  const p = configured as Provider | undefined;
  if (p === 'gemini' && !env('GEMINI_API_KEY')) {
    throw new Error('LLM_PROVIDER=gemini에는 GEMINI_API_KEY가 필요합니다.');
  }
  if (p === 'anthropic' && !env('ANTHROPIC_API_KEY')) {
    throw new Error('LLM_PROVIDER=anthropic에는 ANTHROPIC_API_KEY가 필요합니다.');
  }
  if (p) return p;
  if (env('GEMINI_API_KEY')) return 'gemini';
  if (env('ANTHROPIC_API_KEY')) return 'anthropic';
  if (process.env.NODE_ENV === 'production') {
    throw new Error('운영 환경에는 LLM_PROVIDER와 해당 API 키가 필요합니다.');
  }
  return 'mock';
}

function parseJson(text: string): Extracted {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
  const value: unknown = JSON.parse(s >= 0 && e >= s ? cleaned.slice(s, e + 1) : cleaned);
  if (!value || typeof value !== 'object') throw new Error('LLM 응답이 객체가 아닙니다.');
  const data = value as Partial<Extracted>;
  const pos = data.currentPosition;
  if (!pos || typeof pos.jobTitle !== 'string' || typeof pos.jobFamily !== 'string'
      || typeof pos.careerMonths !== 'number' || typeof pos.summary !== 'string') {
    throw new Error('LLM 응답의 currentPosition 형식이 올바르지 않습니다.');
  }
  if (!Array.isArray(data.skillCandidates) || data.skillCandidates.some((c) =>
    !c || typeof c.name !== 'string' || typeof c.evidenceText !== 'string')) {
    throw new Error('LLM 응답의 skillCandidates 형식이 올바르지 않습니다.');
  }
  return data as Extracted;
}

function keepGroundedSkills(data: Extracted, resumeText: string): Extracted {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s"'“”‘’…]+/gu, '');
  const source = normalize(resumeText);
  const skillCandidates = data.skillCandidates.filter((c) => {
    const evidence = normalize(c.evidenceText);
    return evidence.length >= 2 && source.includes(evidence);
  });
  if (skillCandidates.length !== data.skillCandidates.length) {
    console.warn(`[llm] 원문에서 확인되지 않은 근거 ${data.skillCandidates.length - skillCandidates.length}개 제외`);
  }
  return { ...data, skillCandidates };
}

/**
 * 1단계 — 코드가 원문에서 사전에 있는 이름을 전부 찾아낸다.
 * 찾는 일은 대조라서 코드가 빠뜨리지 않는다. 판단은 LLM 이 한다(2단계).
 */
function mentionSection(resumeText: string): string {
  const found = findMentions(resumeText).filter((m) => USED_SKILL_IDS.has(m.id));
  console.log(`[llm] 코드가 찾은 후보 ${found.length}개: ${found.map((m) => m.name).join(', ')}`);
  return buildMentionSection(found);
}

async function callGemini(resumeText: string, targetJob?: string): Promise<Extracted> {
  const key = env('GEMINI_API_KEY')!;
  const model = env('GEMINI_MODEL') ?? 'gemini-flash-lite-latest';
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: EXTRACT_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{
      text: buildExtractUserPrompt(resumeText, targetJob, VOCABULARY, mentionSection(resumeText)),
    }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  });

  // v1beta 가 막히면 v1 으로 한 번 더 시도한다. 모델·계정에 따라 지원 버전이 다르다.
  const errors: string[] = [];
  for (const ver of ['v1beta', 'v1']) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );
    if (res.ok) {
      const j = await res.json();
      return parseJson(j.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    }
    // 키는 절대 로그에 남기지 않는다
    const detail = await res.text().catch(() => '');
    errors.push(`${ver}: ${res.status} ${detail.slice(0, 160).replace(/\s+/g, ' ')}`);
  }
  throw new Error(`gemini 실패 · model="${model}" · ${errors.join(' | ')}`);
}

async function callAnthropic(resumeText: string, targetJob?: string): Promise<Extracted> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [{ role: 'user',
        content: buildExtractUserPrompt(resumeText, targetJob, VOCABULARY, mentionSection(resumeText)) }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status} ${(await res.text().catch(() => '')).slice(0, 160)}`);
  const j = await res.json();
  return parseJson(j.content?.[0]?.text ?? '');
}

/** 키 없이 파이프라인을 관통시키기 위한 대체 구현 — 원문 경계가 확인된 온톨로지 표기만 쓴다. */
export function mockExtract(resumeText: string): Extracted {
  const mentions = findMentions(resumeText).filter((m) => USED_SKILL_IDS.has(m.id));
  const hits = mentions.map((m) => SKILLS.find((s) => s.id === m.id)!).filter(Boolean);

  const yrs = extractCareerMonths(resumeText);
  const m = yrs.months > 0;
  const ids = new Set(hits.map((h) => h.id));
  const famScore = new Map<string, number>();
  for (const j of JOBS) {
    const w = MATRIX.filter((r) => r.jobId === j.id && ids.has(r.skillId))
      .reduce((a, r) => a + r.weight, 0);
    famScore.set(j.family, (famScore.get(j.family) ?? 0) + w);
  }
  const jobFamily = [...famScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '기획';
  // mock도 원문에 명시된 직무명을 버리지 않는다. 이전에는 모든 경력자를 단순히
  // "경력자"로 바꿔 데이터 분석가처럼 서로 요구 역량이 겹치는 직무의 순위를 뒤집었다.
  const inferredJobId = resolveJobTitle(resumeText);
  const inferredJob = JOBS.find((job) => job.id === inferredJobId);

  return {
    currentPosition: {
      jobTitle: inferredJob?.title ?? (m ? '경력자' : '신입'),
      jobFamily: inferredJob?.family ?? jobFamily,
      careerMonths: yrs.months,
      industry: null,
      summary: '입력한 경험에서 확인된 역량을 기준으로 분석했습니다. (mock 모드)',
    },
    skillCandidates: mentions.map((m) => ({
      name: m.name,
      evidenceText: m.context,
    })),
  };
}

/**
 * 연차는 **코드가 정한다.** LLM 이 뽑은 값은 참고만 한다.
 *
 * 실측: "8년차 iOS 개발자입니다" 로 시작하는 글에서 Gemini 가 careerMonths 를 0 으로 줬다.
 * 직무명은 제대로 읽으면서 숫자를 흘린다. 숫자는 규칙이 확실하고, 틀려도 이유를 댈 수 있다.
 *
 * 규칙이 못 찾았을 때만 LLM 값을 쓴다 — 규칙이 모르는 표기가 있을 수 있다.
 */
function fixCareer(data: Extracted, resumeText: string): Extracted {
  const found = extractCareerMonths(resumeText);
  const fromLlm = data.currentPosition.careerMonths ?? 0;
  const months = found.months > 0 ? found.months : fromLlm;
  if (months !== fromLlm) {
    console.log(`[career] LLM ${fromLlm}개월 → 규칙 ${months}개월 (${found.why})`);
  }
  return { ...data, currentPosition: { ...data.currentPosition, careerMonths: months } };
}

export async function extractProfile(
  resumeText: string,
  targetJob?: string
): Promise<{ data: Extracted; provider: Provider }> {
  const p = activeProvider();
  if (p === 'gemini') {
    const extracted = keepGroundedSkills(await callGemini(resumeText, targetJob), resumeText);
    return { data: fixCareer(extracted, resumeText), provider: 'gemini' };
  }
  if (p === 'anthropic') {
    const extracted = keepGroundedSkills(await callAnthropic(resumeText, targetJob), resumeText);
    return { data: fixCareer(extracted, resumeText), provider: 'anthropic' };
  }
  return { data: fixCareer(mockExtract(resumeText), resumeText), provider: 'mock' };
}
