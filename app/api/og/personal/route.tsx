import { ImageResponse } from 'next/og';
import { loadKoreanFont } from '@/lib/og-font';

// 폰트 파일을 읽어야 하므로 Node 런타임. Edge 는 node:fs 폴백을 쓸 수 없다.
export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================================
//  결과 공유 카드
//
//  ── 왜 밝은 배경인가
//  예전에는 다크 고정이었다. "SNS 미리보기가 어느 배경에 놓일지 모른다"는 이유였는데,
//  두 가지가 바뀌었다. 서비스가 라이트 전용이 되어 카드만 검으면 저장해 둔 그림과
//  실제 화면이 달라 보이고, 저장해서 다시 보는 용도라면 어두운 그림이 문서·메모에
//  섞였을 때 더 튄다. 서비스와 같은 크림 바닥을 쓴다.
//
//  ── 왜 경로를 셋 다 싣는가
//  1위 하나만 실으면 "이 사람은 이 직무"라는 단정이 된다. 우리 화면은 애초에
//  셋을 나란히 놓고 고르게 하는 것이고, 저장용 리포트라면 더더욱 그래야 한다.
//
//  색 규칙은 화면과 같다 — 청록은 가진 것, 앰버는 원래 안 보이던 것.
// ============================================================================

const BG = '#faf7f2';
const CARD = '#ffffff';
const INK = '#1c1917';
const BODY = '#524b45';
const MUTE = '#7c736b';
const HAIRLINE = '#e9e4dc';
const LINK = '#0f766e';      // 보유한 것
const LINK_SOFT = '#d7f0ec';
const WARNING = '#b06f0a';   // "이 길도 있어요"
const WARNING_SOFT = '#fff4dd';

// 결과를 서버에 저장하지 않으므로 필요한 값만 쿼리로 받는다.
//   jt 현재 직무 · cm 경력개월
//   r  경로 셋 — `목적지~보유~전체~히든여부` 를 `|` 로 이음
//   b  1위 경로에서 이미 가진 역량(| 구분)
//
// ⚠️ 적합도(0~100)는 싣지 않는다. 눈금 문제가 아니라 맥락 때문이다.
//    타임라인에 숫자 하나만 떠 있으면 "46점짜리 사람"으로 읽힌다.
//    셀 수 있는 사실이 그 자체로 말이 된다 — 필수 역량 6개 중 4개 보유.
//
// ⚠️ 카드에 쓰는 고정 문구는 반드시 여기에 모은다.
//    폰트를 text= 서브셋으로 받기 때문에, 여기 없는 글자는 카드에서 □ 로 나온다.
//    JSX 에 직접 문자열을 적으면 서브셋 목록과 어긋나 조용히 깨진다.
//    실제로 '적합도' 를 '개 보유' 로 바꾸면서 '보유' 가 빠져 네모로 나왔다.
const T = {
  brand: 'Career Navi',
  hidden: '이 길도 있어요',
  routes: '연결되는 커리어 경로',
  mustPre: '필수 역량',
  mustMid: '개 중',
  mustPost: '개 보유',
  bridges: '이미 가진 무기',
  tagline: '직무명이 아니라 역량으로',
  contest: '원티드 AI Championship 2026',
  newcomer: '신입',
  years: '년차',
} as const;

type Row = { dest: string; held: string; total: string; hidden: boolean };

function parseRoutes(raw: string | null): Row[] {
  if (!raw) return [];
  return raw
    .split('|')
    .filter(Boolean)
    .slice(0, 3)
    .map((chunk) => {
      const [dest, held, total, hidden] = chunk.split('~');
      return { dest, held: held ?? '0', total: total ?? '0', hidden: hidden === '1' };
    })
    .filter((row) => row.dest);
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const jobTitle = p.get('jt') ?? T.newcomer;
  const months = Number(p.get('cm') ?? 0);
  const rows = parseRoutes(p.get('r'));
  const bridges = (p.get('b') ?? '').split('|').filter(Boolean).slice(0, 3);

  // 경로를 하나만 받으면 그 하나를 크게 보여준다.
  //
  // 셋을 담을 때와 같은 틀에 한 줄만 그리면 카드가 텅 비어 보인다.
  // 저장하는 사람은 "이 경로"를 남기려는 것이므로, 목적지를 화면의 주인공으로 둔다.
  const single = rows.length === 1 ? rows[0] : null;

  const career = months < 12 ? T.newcomer : `${Math.floor(months / 12)}${T.years}`;
  const all =
    Object.values(T).join(' ') +
    ' 0123456789 · ' +
    `${jobTitle}${career}${bridges.join('')}${rows.map((r) => r.dest + r.held + r.total).join('')}`;

  const [bold, regular] = await Promise.all([
    loadKoreanFont(all, 700),
    loadKoreanFont(all, 400),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: BG, color: BODY, padding: '44px 56px', fontFamily: 'Noto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 25, color: INK, fontWeight: 700, letterSpacing: -0.4 }}>
            {T.brand}
          </div>
          <div style={{ display: 'flex', fontSize: 23, color: MUTE, fontWeight: 400 }}>
            {jobTitle} · {career}
          </div>
        </div>

        {single ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            {single.hidden && (
              <div style={{ display: 'flex', marginBottom: 18 }}>
                <div style={{ display: 'flex', background: WARNING_SOFT, color: WARNING,
                  fontSize: 22, fontWeight: 700, padding: '8px 19px', borderRadius: 999 }}>
                  {T.hidden}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, color: INK,
              letterSpacing: -2.4, lineHeight: 1.15 }}>
              {single.dest}
            </div>
            <div style={{ display: 'flex', marginTop: 20, alignItems: 'baseline', gap: 10 }}>
              <div style={{ display: 'flex', fontSize: 24, color: MUTE, fontWeight: 400 }}>{T.mustPre}</div>
              <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: INK }}>{single.total}</div>
              <div style={{ display: 'flex', fontSize: 24, color: MUTE, fontWeight: 400 }}>{T.mustMid}</div>
              <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: LINK }}>{single.held}</div>
              <div style={{ display: 'flex', fontSize: 24, color: MUTE, fontWeight: 400 }}>{T.mustPost}</div>
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 40, color: INK, fontWeight: 700,
          letterSpacing: -1.4, marginTop: 26 }}>
          {T.routes}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
          {rows.map((row, i) => (
            <div key={row.dest} style={{ display: 'flex', alignItems: 'center', gap: 20,
              background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: '18px 24px' }}>
              <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: MUTE, width: 44 }}>
                0{i + 1}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: INK, letterSpacing: -1 }}>
                    {row.dest}
                  </div>
                  {row.hidden && (
                    <div style={{ display: 'flex', background: WARNING_SOFT, color: WARNING,
                      fontSize: 18, fontWeight: 700, padding: '5px 13px', borderRadius: 999 }}>
                      {T.hidden}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <div style={{ display: 'flex', fontSize: 19, color: MUTE, fontWeight: 400 }}>{T.mustPre}</div>
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: INK }}>{row.total}</div>
                <div style={{ display: 'flex', fontSize: 19, color: MUTE, fontWeight: 400 }}>{T.mustMid}</div>
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: LINK }}>{row.held}</div>
                <div style={{ display: 'flex', fontSize: 19, color: MUTE, fontWeight: 400 }}>{T.mustPost}</div>
              </div>
            </div>
          ))}
        </div>
        </div>
        )}

        {bridges.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, marginBottom: single ? 30 : 0 }}>
            <div style={{ display: 'flex', fontSize: 19, color: MUTE, fontWeight: 400 }}>
              {T.bridges}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {bridges.map((b) => (
                <div key={b} style={{ display: 'flex', fontSize: 21, padding: '7px 15px', borderRadius: 10,
                  background: LINK_SOFT, color: LINK, fontWeight: 700 }}>{b}</div>
              ))}
            </div>
          </div>
        )}

        {/* 한 장짜리 카드는 위쪽 블록이 이미 flex:1 로 공간을 먹는다.
            여기서 또 밀면 늘어나는 칸이 둘이 되어 공간을 반씩 나눠 갖고,
            내용이 위로 몰리면서 가운데가 휑해진다. */}
        {!single && <div style={{ display: 'flex', flex: 1 }} />}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderTop: `1px solid ${HAIRLINE}`, paddingTop: 18 }}>
          <div style={{ display: 'flex', fontSize: 24, color: INK, fontWeight: 700, letterSpacing: -0.5 }}>
            {T.tagline}
          </div>
          <div style={{ display: 'flex', fontSize: 19, color: MUTE, fontWeight: 400 }}>
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
