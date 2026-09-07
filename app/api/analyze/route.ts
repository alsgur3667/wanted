import { NextResponse } from 'next/server';
import { INPUT_GUARD } from '@/lib/prompts/extract';
import { extractProfile } from '@/lib/llm';
import { buildAnalysis } from '@/lib/scoring';
import type { ErrorCode } from '@/types';

// 데모 비용 방어용 프로세스 로컬 상한이다. 여러 인스턴스가 뜨는 운영 환경에서는
// 공유 저장소나 플랫폼 rate limit을 별도로 둬야 한다.
const configuredLimit = Number(process.env.DAILY_CALL_LIMIT ?? 150);
const DAILY_LIMIT = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 150;
let day = new Date().toISOString().slice(0, 10);
let count = 0;

export async function POST(req: Request) {
  const fail = (code: ErrorCode, message: string, status = 400) =>
    NextResponse.json({ ok: false, code, message }, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });

  let body: unknown;
  try { body = await req.json(); } catch { return fail('UNKNOWN', '요청을 읽지 못했습니다.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return fail('UNKNOWN', '요청 형식이 올바르지 않습니다.');

  const input = body as Record<string, unknown>;
  if (typeof input.resumeText !== 'string')
    return fail('UNKNOWN', 'resumeText는 문자열이어야 합니다.');
  if (input.targetJob !== undefined && typeof input.targetJob !== 'string')
    return fail('UNKNOWN', 'targetJob은 문자열이어야 합니다.');

  const text = input.resumeText.trim();
  if (text.length < INPUT_GUARD.minChars)
    return fail('TOO_SHORT', `경험을 ${INPUT_GUARD.minChars}자 이상 적어주세요. 프로젝트·인턴 경험도 괜찮습니다.`);
  if (text.length > INPUT_GUARD.maxChars)
    return fail('UNKNOWN', `경험은 ${INPUT_GUARD.maxChars.toLocaleString()}자 이하로 적어주세요.`);

  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; count = 0; }
  if (count >= DAILY_LIMIT)
    return fail('RATE_LIMIT', '오늘 분석 가능한 횟수를 모두 사용했습니다. 아래 예시로 먼저 확인해 보세요.', 429);

  try {
    count++;
    const targetJob = typeof input.targetJob === 'string' ? input.targetJob.trim().slice(0, 200) : undefined;
    const { data, provider } = await extractProfile(text, targetJob);
    const result = buildAnalysis(data);
    if (!result.skills.length || !result.routes.length)
      return fail('LLM_FAILED', '원문에서 확인할 수 있는 역량을 찾지 못했습니다. 사용한 기술과 맡은 일을 조금 더 구체적으로 적어주세요.');
    console.log(`[analyze] provider=${provider} skills=${result.skills.length} routes=${result.routes.length}`);
    return NextResponse.json({ ok: true, data: result }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[analyze]', e);
    return fail('LLM_FAILED', '분석 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
}
