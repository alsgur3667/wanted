import { EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt, buildVocabularySection } from '@/lib/prompts/extract';
import { JOBS, MATRIX, SKILLS } from '@/lib/skill-index';

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
  const p = env('LLM_PROVIDER') as Provider | undefined;
  if (p) return p;
  if (env('GEMINI_API_KEY')) return 'gemini';
  if (env('ANTHROPIC_API_KEY')) return 'anthropic';
  return 'mock';
}

function parseJson(text: string): Extracted {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
  return JSON.parse(s >= 0 ? cleaned.slice(s, e + 1) : cleaned);
}

async function callGemini(resumeText: string, targetJob?: string): Promise<Extracted> {
  const key = env('GEMINI_API_KEY')!;
  const model = env('GEMINI_MODEL') ?? 'gemini-flash-lite-latest';
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: EXTRACT_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: buildExtractUserPrompt(resumeText, targetJob, VOCABULARY) }] }],
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
      messages: [{ role: 'user', content: buildExtractUserPrompt(resumeText, targetJob, VOCABULARY) }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status} ${(await res.text().catch(() => '')).slice(0, 160)}`);
  const j = await res.json();
  return parseJson(j.content?.[0]?.text ?? '');
}

/** 키 없이 파이프라인을 관통시키기 위한 대체 구현 — 온톨로지 표기 매칭 */
function mockExtract(resumeText: string): Extracted {
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-_./()]/g, '');
  const t = norm(resumeText);
  const hits = SKILLS.filter((s) =>
    [s.name, ...(s.aliases ?? [])].some((n) => n.length >= 2 && t.includes(norm(n)))
  ).slice(0, 14);

  const m = resumeText.match(/(\d+)\s*년\s*차/);
  const ids = new Set(hits.map((h) => h.id));
  const famScore = new Map<string, number>();
  for (const j of JOBS) {
    const w = MATRIX.filter((r) => r.jobId === j.id && ids.has(r.skillId))
      .reduce((a, r) => a + r.weight, 0);
    famScore.set(j.family, (famScore.get(j.family) ?? 0) + w);
  }
  const jobFamily = [...famScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '기획';

  return {
    currentPosition: {
      jobTitle: m ? '경력자' : '신입',
      jobFamily,
      careerMonths: m ? parseInt(m[1]) * 12 : 0,
      industry: null,
      summary: '입력한 경험에서 확인된 역량을 기준으로 분석했습니다. (mock 모드)',
    },
    skillCandidates: hits.map((s) => ({
      name: s.name,
      evidenceText: '(mock 모드 — 실제 근거 문장은 LLM 연결 시 채워집니다)',
    })),
  };
}

export async function extractProfile(
  resumeText: string,
  targetJob?: string
): Promise<{ data: Extracted; provider: Provider }> {
  const p = activeProvider();
  try {
    if (p === 'gemini') return { data: await callGemini(resumeText, targetJob), provider: 'gemini' };
    if (p === 'anthropic') return { data: await callAnthropic(resumeText, targetJob), provider: 'anthropic' };
  } catch (e) {
    console.error('[llm] 호출 실패, mock 으로 폴백:', e);
  }
  return { data: mockExtract(resumeText), provider: 'mock' };
}
