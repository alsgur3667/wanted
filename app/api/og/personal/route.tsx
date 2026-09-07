import { ImageResponse } from 'next/og';
import { loadKoreanFont } from '@/lib/og-font';

// 폰트 파일을 읽어야 하므로 Node 런타임. Edge 는 node:fs 폴백을 쓸 수 없다.
export const runtime = 'nodejs';
export const maxDuration = 30;

const AMBER = '#f5a524';
const BG = '#0a0a0a';

// 결과를 서버에 저장하지 않으므로 필요한 값만 쿼리로 받는다.
// 전체 AnalysisResult 를 넘기면 URL 길이 제한(약 2KB)에 걸리고 캐시 키도 지저분해진다.
//   jt 현재 직무 · cm 경력개월 · d 목적지 · mh/mt 필수 보유/전체 · b 보유역량(| 구분)
//
// ⚠️ 적합도(0~100)를 싣지 않는다.
//    그 값은 네 가지가 섞인 점수인데(커버율 둘 + 강점 반영 + 직무 보정) 카드에는
//    맥락이 없어 "46점짜리 사람"으로 읽힌다. 게다가 눈금이 눌려 있다(이슈 #28).
//    대신 셀 수 있는 사실 하나만 싣는다 — 그 직무의 필수 역량 중 몇 개를 갖췄는가.
// ⚠️ 카드에 쓰는 고정 문구는 반드시 여기에 모은다.
//    폰트를 text= 서브셋으로 받기 때문에, 여기 없는 글자는 카드에서 □ 로 나온다.
//    JSX 에 직접 문자열을 적으면 서브셋 목록과 어긋나 조용히 깨진다.
//    실제로 '적합도' 를 '개 보유' 로 바꾸면서 '보유' 가 빠져 네모로 나왔다.
const T = {
  brand: '커리어 내비',
  hidden: '이 길도 있어요',
  best: '가장 잘 맞는 길',
  mustPre: '필수 역량',
  mustMid: '개 중',
  mustPost: '개 보유',
  bridges: '이미 가진 무기',
  tagline: '직무명이 아니라 역량으로',
  contest: '원티드 AI Championship 2026',
  newcomer: '신입',
  years: '년차',
} as const;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const jobTitle = p.get('jt') ?? T.newcomer;
  const months = Number(p.get('cm') ?? 0);
  const dest = p.get('d') ?? '프로덕트 디자이너';
  const mustHeld = p.get('mh') ?? '3';
  const mustTotal = p.get('mt') ?? '5';
  const bridges = (p.get('b') ?? '').split('|').filter(Boolean).slice(0, 3);
  // hidden=1 일 때만 "이 길도 있어요" 배지를 붙인다
  const isHidden = p.get('hidden') === '1';

  const career = months < 12 ? T.newcomer : `${Math.floor(months / 12)}${T.years}`;
  const all =
    Object.values(T).join(' ') +
    ' 0123456789 · ' +
    `${jobTitle}${career}${dest}${mustHeld}${mustTotal}${bridges.join('')}`;

  const [bold, regular] = await Promise.all([
    loadKoreanFont(all, 700),
    loadKoreanFont(all, 400),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: BG, color: '#ededed', padding: '56px 68px', fontFamily: 'Noto' }}>

        <div style={{ display: 'flex', fontSize: 26, color: '#8a8a8a', fontWeight: 400,
          letterSpacing: 1 }}>{T.brand}</div>

        {/* 가운데 블록을 세로 중앙에 둔다 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 28, color: '#9a9a9a', fontWeight: 400 }}>
            {jobTitle} · {career}
          </div>

          <div style={{ display: 'flex', marginTop: 16 }}>
            <div style={{ display: 'flex',
              background: isHidden ? 'rgba(245,165,36,0.16)' : 'rgba(255,255,255,0.07)',
              color: isHidden ? AMBER : '#9a9a9a',
              fontSize: 22, fontWeight: 700, padding: '7px 18px', borderRadius: 999 }}>
              {isHidden ? T.hidden : T.best}
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 18 }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>
              {dest}
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 14, alignItems: 'baseline', gap: 10 }}>
            <div style={{ display: 'flex', fontSize: 22, color: '#8a8a8a', fontWeight: 400 }}>{T.mustPre}</div>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: AMBER }}>{mustTotal}</div>
            <div style={{ display: 'flex', fontSize: 22, color: '#8a8a8a', fontWeight: 400 }}>{T.mustMid}</div>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: AMBER }}>{mustHeld}</div>
            <div style={{ display: 'flex', fontSize: 22, color: '#8a8a8a', fontWeight: 400 }}>{T.mustPost}</div>
          </div>

          {bridges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
              <div style={{ display: 'flex', fontSize: 21, color: '#7a7a7a', fontWeight: 400 }}>
                {T.bridges}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                {bridges.map((b) => (
                  <div key={b} style={{ display: 'flex', fontSize: 24, padding: '9px 18px', borderRadius: 12,
                    background: 'rgba(16,185,129,0.13)', color: '#6ee7b7' }}>{b}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 22 }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#d4d4d4', fontWeight: 700 }}>
            {T.tagline}
          </div>
          <div style={{ display: 'flex', fontSize: 21, color: '#6a6a6a', fontWeight: 400 }}>
            {T.contest}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: [
        { name: 'Noto', data: bold, weight: 700, style: 'normal' },
        { name: 'Noto', data: regular, weight: 400, style: 'normal' },
      ],
    }
  );
}
