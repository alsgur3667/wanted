import { NextResponse } from 'next/server';
import { INPUT_GUARD } from '@/lib/prompts/extract';
import { extractProfile } from '@/lib/llm';
import { buildAnalysis } from '@/lib/scoring';
import type { ErrorCode } from '@/types';

// 비용·안정성 방어 3중
//  ① 동일 입력 캐시 — 같은 이력서를 두 번 호출하지 않는다
//  ② 일일 상한   — 무료 티어 한도보다 낮게 잡아 rate limit 전에 우리가 먼저 막는다
//  ③ 실패 폴백   — LLM 이 죽어도 500 대신 안내를 주고, 화면은 샘플로 유도한다
const cache = new Map<string, unknown>();
const DAILY_LIMIT = Number(process.env.DAILY_CALL_LIMIT ?? 150);
let day = new Date().toDateString();
let count = 0;

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h);
};

export async function POST(req: Request) {
  const fail = (code: ErrorCode, message: string, status = 400) =>
    NextResponse.json({ ok: false, code, message }, { status });

  let body: { resumeText?: string; targetJob?: string };
  try { body = await req.json(); } catch { return fail('UNKNOWN', '요청을 읽지 못했습니다.'); }

  const text = (body.resumeText ?? '').trim();
  if (text.length < INPUT_GUARD.minChars)
    return fail('TOO_SHORT', `경험을 ${INPUT_GUARD.minChars}자 이상 적어주세요. 프로젝트·인턴 경험도 괜찮습니다.`);

  const key = hash(text.slice(0, INPUT_GUARD.maxChars) + (body.targetJob ?? ''));
  if (cache.has(key)) return NextResponse.json({ ok: true, data: cache.get(key) });

  const today = new Date().toDateString();
  if (today !== day) { day = today; count = 0; }
  if (count >= DAILY_LIMIT)
    return fail('RATE_LIMIT', '오늘 분석 가능한 횟수를 모두 사용했습니다. 아래 예시로 먼저 확인해 보세요.', 429);

  try {
    count++;
    const { data, provider } = await extractProfile(text.slice(0, INPUT_GUARD.maxChars), body.targetJob);
    const result = buildAnalysis(data);
    if (!result.routes.length)
      return fail('LLM_FAILED', '역량을 충분히 찾지 못했습니다. 무엇을 했는지 조금 더 구체적으로 적어주세요.');
    cache.set(key, result);
    console.log(`[analyze] provider=${provider} skills=${result.skills.length} routes=${result.routes.length}`);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    console.error('[analyze]', e);
    return fail('LLM_FAILED', '분석 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
}
