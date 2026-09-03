// ============================================================================
//  OG 이미지용 한글 폰트 로더
//
//  ⚠️ satori(ImageResponse) 는 기본 폰트로 한글을 렌더링하지 못한다. 폰트를 직접 넘겨야 한다.
//     그리고 satori 는 TTF / OTF / WOFF 만 읽는다. WOFF2 는 지원하지 않는다.
//
//  전략 — Google Fonts 의 `text=` 서브셋 API 로 "이번 카드에 실제로 쓰인 글자"만 받는다.
//    · 한글 전체 폰트는 4~5MB 라 서버리스 번들·콜드스타트에 부담이 크다
//    · text= 로 요청하면 보통 10~30KB 로 줄어든다
//    · User-Agent 를 비워 보내야 woff2 대신 truetype 을 준다 (satori 가 읽을 수 있는 형식)
//
//  네트워크 실패 시에는 번들된 WOFF 로 폴백한다. 배포 환경에서 폰트를 못 받아
//  카드가 □□□ 로 나오는 사고를 막기 위한 안전장치다.
// ============================================================================

const cache = new Map<string, ArrayBuffer>();

async function fromGoogle(text: string, weight: 400 | 700): Promise<ArrayBuffer> {
  const chars = [...new Set(text)].join('');
  const url =
    `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}` +
    `&text=${encodeURIComponent(chars)}`;

  // UA 를 최소한으로 — 모던 UA 를 보내면 woff2 를 받게 되어 satori 가 읽지 못한다
  const css = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then((r) => {
    if (!r.ok) throw new Error(`google fonts ${r.status}`);
    return r.text();
  });

  const m = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/);
  if (!m) throw new Error('truetype URL 을 찾지 못함');
  const res = await fetch(m[1]);
  if (!res.ok) throw new Error(`font file ${res.status}`);
  return res.arrayBuffer();
}

async function fromBundle(weight: 400 | 700): Promise<ArrayBuffer> {
  // 번들된 WOFF (satori 지원 형식). 네트워크가 막힌 환경의 폴백.
  // ⚠️ node_modules 를 require.resolve 로 참조하면 번들러가 폰트 전 굵기를 끌어와 빌드가 깨진다.
  //    assets/ 에 두고 런타임 경로로 읽는다. next.config 의 outputFileTracingIncludes 로 배포에 포함시킨다.
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const buf = await readFile(join(process.cwd(), 'assets', 'fonts', `noto-kr-${weight}.woff`));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** 카드에 들어갈 문자열 전부를 넘기면, 그 글자만 담긴 폰트를 돌려준다 */
export async function loadKoreanFont(text: string, weight: 400 | 700 = 700) {
  const key = `${weight}:${[...new Set(text)].sort().join('')}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let buf: ArrayBuffer;
  try {
    buf = await fromGoogle(text, weight);
  } catch (e) {
    console.warn('[og-font] 서브셋 실패, 번들 폰트로 폴백:', (e as Error).message);
    buf = await fromBundle(weight);
  }
  cache.set(key, buf);
  return buf;
}
