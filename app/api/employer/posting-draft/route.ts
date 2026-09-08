import { NextResponse } from 'next/server';
import { generatePostingDraft } from '@/lib/posting-ai';
import { validatePostingDraft, validatePostingDraftRequest } from '@/lib/posting-draft';

const configuredLimit = Number(process.env.POSTING_DRAFT_DAILY_LIMIT ?? 80);
const DAILY_LIMIT = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 80;
let day = new Date().toISOString().slice(0, 10);
let count = 0;

export async function POST(request: Request) {
  const fail = (code: 'INVALID_INPUT' | 'RATE_LIMIT' | 'LLM_FAILED', message: string, status = 400) =>
    NextResponse.json({ ok: false, code, message }, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('INVALID_INPUT', '요청 내용을 읽을 수 없습니다.');
  }

  const checked = validatePostingDraftRequest(body);
  if (!checked.ok) return fail('INVALID_INPUT', checked.errors[0]);

  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    count = 0;
  }
  if (count >= DAILY_LIMIT) return fail('RATE_LIMIT', '오늘 사용할 수 있는 AI 초안 생성 횟수를 모두 사용했습니다.', 429);

  try {
    count += 1;
    const { draft, provider, warnings } = await generatePostingDraft(checked.data);
    const validation = validatePostingDraft(draft);
    if (!validation.ok) throw new Error(validation.errors.join(' '));
    return NextResponse.json({ ok: true, data: draft, provider, warnings: [...new Set([...warnings, ...validation.warnings])] }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[posting-draft]', error);
    return fail('LLM_FAILED', '공고 초안을 만드는 중 문제가 발생했습니다. 입력을 확인하고 다시 시도해 주세요.', 500);
  }
}
