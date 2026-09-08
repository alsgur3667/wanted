import { activeProvider } from '@/lib/llm';
import { companyById } from '@/lib/company-index';
import { getJob } from '@/lib/skill-index';
import { buildPostingPrompt, POSTING_SYSTEM_PROMPT } from '@/lib/prompts/posting';
import { createDraftBase, postingContentWarnings } from '@/lib/posting-draft';
import type { PostingDraft, PostingDraftRequest } from '@/types';

type GeneratedCopy = Pick<PostingDraft, 'title' | 'summary' | 'responsibilities'>;

function env(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  return value.trim().replace(/^["']|["']$/g, '').trim() || undefined;
}

function parseGeneratedCopy(text: string): GeneratedCopy {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const value: unknown = JSON.parse(start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned);
  if (!value || typeof value !== 'object') throw new Error('AI 응답이 객체가 아닙니다.');
  const row = value as Partial<GeneratedCopy>;
  if (typeof row.title !== 'string' || typeof row.summary !== 'string'
      || !Array.isArray(row.responsibilities)
      || row.responsibilities.some((item) => typeof item !== 'string')) {
    throw new Error('AI 응답의 공고 형식이 올바르지 않습니다.');
  }
  return {
    title: row.title.trim().slice(0, 80),
    summary: row.summary.trim().slice(0, 500),
    responsibilities: row.responsibilities.map((item) => item.trim().slice(0, 160)).filter(Boolean).slice(0, 8),
  };
}

function mockCopy(input: PostingDraftRequest, productDescription: string, jobTitle: string): GeneratedCopy {
  const context = input.context.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  return {
    title: `${input.level === '미들' ? '' : `${input.level} `}${jobTitle}`.trim(),
    summary: `${productDescription}에서 다음 과제를 함께 해결할 ${jobTitle}를 찾습니다. ${context}.`,
    responsibilities: [
      `${context}.`,
      '관련 팀과 목표와 기준을 맞추고 진행 상황을 투명하게 공유합니다.',
      '결과를 지표와 사용자 피드백으로 확인하고 다음 개선안을 제안합니다.',
    ],
  };
}

async function callGemini(prompt: string) {
  const model = env('GEMINI_MODEL') ?? 'gemini-flash-lite-latest';
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: POSTING_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  });
  const errors: string[] = [];
  for (const version of ['v1beta', 'v1']) {
    const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${encodeURIComponent(env('GEMINI_API_KEY')!)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    if (response.ok) {
      const json = await response.json();
      return parseGeneratedCopy(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    }
    errors.push(`${version}: ${response.status} ${(await response.text().catch(() => '')).slice(0, 120)}`);
  }
  throw new Error(`gemini 공고 생성 실패: ${errors.join(' | ')}`);
}

async function callAnthropic(prompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001',
      max_tokens: 1600,
      temperature: 0,
      system: POSTING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`anthropic 공고 생성 실패: ${response.status} ${(await response.text().catch(() => '')).slice(0, 120)}`);
  const json = await response.json();
  return parseGeneratedCopy(json.content?.[0]?.text ?? '');
}

export async function generatePostingDraft(input: PostingDraftRequest) {
  const company = companyById(input.companyId);
  const job = getJob(input.jobId);
  if (!company || !job) throw new Error('회사 또는 직무 참조를 찾을 수 없습니다.');
  const provider = activeProvider();
  const prompt = buildPostingPrompt(input, company, job.title);
  const copy = provider === 'gemini'
    ? await callGemini(prompt)
    : provider === 'anthropic'
      ? await callAnthropic(prompt)
      : mockCopy(input, company.productDescription, job.title);
  const draft = { ...createDraftBase(input, company, 'ai'), ...copy };
  return { draft, provider, warnings: postingContentWarnings([copy.title, copy.summary, ...copy.responsibilities].join(' ')) };
}
