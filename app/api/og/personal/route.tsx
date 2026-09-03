import { ImageResponse } from 'next/og';
import { loadKoreanFont } from '@/lib/og-font';

// 폰트 파일을 읽어야 하므로 Node 런타임. Edge 는 node:fs 폴백을 쓸 수 없다.
export const runtime = 'nodejs';
export const maxDuration = 30;

const AMBER = '#f5a524';
const BG = '#0a0a0a';

// 결과를 서버에 저장하지 않으므로 필요한 값만 쿼리로 받는다.
// 전체 AnalysisResult 를 넘기면 URL 길이 제한(약 2KB)에 걸리고 캐시 키도 지저분해진다.
//   jt 현재 직무 · cm 경력개월 · d 목적지 · f 적합도 · b 보유역량(| 구분)
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const jobTitle = p.get('jt') ?? '신입';
  const months = Number(p.get('cm') ?? 0);
  const dest = p.get('d') ?? '프로덕트 디자이너';
  const fit = p.get('f') ?? '71';
  const bridges = (p.get('b') ?? '').split('|').filter(Boolean).slice(0, 3);
  // hidden=1 일 때만 "이 길도 있어요" 배지를 붙인다
  const isHidden = p.get('hidden') === '1';

  const career = months < 12 ? '신입' : `${Math.floor(months / 12)}년차`;
  const all =
    `커리어 내비 이 길도 있어요 가장 잘 맞는 길 적합도 이미 가진 무기 원티드 AI Championship 2026 ` +
    `직무명이 아니라 역량으로 ${jobTitle}${career}${dest}${fit}${bridges.join('')}`;

  const [bold, regular] = await Promise.all([
    loadKoreanFont(all, 700),
    loadKoreanFont(all, 400),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: BG, color: '#ededed', padding: '68px 72px', fontFamily: 'Noto' }}>

        <div style={{ display: 'flex', fontSize: 26, color: '#8a8a8a', fontWeight: 400,
          letterSpacing: 1 }}>커리어 내비</div>

        {/* 가운데 블록을 세로 중앙에 둔다 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 32, color: '#9a9a9a', fontWeight: 400 }}>
            {jobTitle} · {career}
          </div>

          <div style={{ display: 'flex', marginTop: 26 }}>
            <div style={{ display: 'flex',
              background: isHidden ? 'rgba(245,165,36,0.16)' : 'rgba(255,255,255,0.07)',
              color: isHidden ? AMBER : '#9a9a9a',
              fontSize: 25, fontWeight: 700, padding: '9px 22px', borderRadius: 999 }}>
              {isHidden ? '이 길도 있어요' : '가장 잘 맞는 길'}
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 24, alignItems: 'baseline', gap: 30 }}>
            <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>
              {dest}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, color: AMBER }}>{fit}</div>
              <div style={{ display: 'flex', fontSize: 24, color: '#8a8a8a', fontWeight: 400 }}>적합도</div>
            </div>
          </div>

          {bridges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 46 }}>
              <div style={{ display: 'flex', fontSize: 23, color: '#7a7a7a', fontWeight: 400 }}>
                이미 가진 무기
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                {bridges.map((b) => (
                  <div key={b} style={{ display: 'flex', fontSize: 27, padding: '11px 22px', borderRadius: 12,
                    background: 'rgba(16,185,129,0.13)', color: '#6ee7b7' }}>{b}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 26 }}>
          <div style={{ display: 'flex', fontSize: 29, color: '#d4d4d4', fontWeight: 700 }}>
            직무명이 아니라 역량으로
          </div>
          <div style={{ display: 'flex', fontSize: 21, color: '#6a6a6a', fontWeight: 400 }}>
            원티드 AI Championship 2026
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
