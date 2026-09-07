/**
 * 이력서 글에서 **경력 개월수**를 뽑는다 — LLM 이 아니라 규칙으로.
 *
 * 왜 코드로 뽑나
 *   LLM 에게 맡겼더니 "8년차 iOS 개발자입니다" 라고 적힌 글에서 careerMonths 가 0 으로 왔다.
 *   직무명은 제대로 읽으면서 숫자를 흘린다. 숫자는 규칙이 더 확실하고, 틀려도 이유를 알 수 있다.
 *
 * 사람마다 적는 방식이 다르다 — 실제로 쓰이는 표기를 모아 뒀다.
 *   8년차 · 8년 차 · 8년째 · 경력 8년 · 경력: 8년 · 연차: 8년 · 총 경력 8년 6개월
 *   8 years · 8+ years of experience · 3~5년 · 3-5년
 *   신입 · 주니어 · 인턴 → 0
 *
 * ⚠️ '3년 이상 경력자를 찾습니다' 같은 **구인 문구**를 사람의 경력으로 읽으면 안 된다.
 *    이력서에 회사 소개나 채용 공고를 함께 붙여 넣는 경우가 있다.
 *    그래서 '이상 요구·우대·자격' 같은 말이 가까이 있으면 버린다.
 *
 * ⚠️ 여러 값이 나오면 **가장 큰 값**을 쓴다. 이력서에는 프로젝트별 기간이 여럿 적히는데
 *    그중 가장 긴 것이 대개 전체 경력에 가깝다. 합치면 겹치는 기간이 이중으로 세어진다.
 */

const MAX_YEARS = 45;

/** 이 표현이 가까이 있으면 사람의 경력이 아니라 '요구 조건' 이다 */
const DEMAND_NEAR = /(이상|우대|자격|요건|모집|채용|찾습니다|필요합니다|바랍니다)/;

type Hit = { months: number; why: string };

function pushYear(out: Hit[], years: number, why: string, months = 0) {
  if (!Number.isFinite(years) || years < 0 || years > MAX_YEARS) return;
  out.push({ months: Math.round(years * 12 + months), why });
}

/** 그 자리 주변에 '요구 조건' 표현이 있나 */
function isDemand(text: string, at: number): boolean {
  return DEMAND_NEAR.test(text.slice(at, at + 24));
}

export function extractCareerMonths(text: string): { months: number; why: string } {
  if (!text) return { months: 0, why: '입력 없음' };
  const t = text.replace(/\s+/g, ' ');
  const hits: Hit[] = [];

  //  8년차 · 8년 차 · 8년째 · 8년 경력
  for (const m of t.matchAll(/(\d{1,2})\s*년\s*(?:차|째|경력)/g)) {
    if (!isDemand(t, m.index! + m[0].length)) pushYear(hits, +m[1], m[0].trim());
  }
  //  경력 8년 · 경력: 8년 6개월 · 연차 8년 · 총 경력 8년
  for (const m of t.matchAll(/(?:경력|연차|경험)\s*[:：]?\s*(?:약\s*)?(\d{1,2})\s*년(?:\s*(\d{1,2})\s*개월)?/g)) {
    if (!isDemand(t, m.index! + m[0].length)) pushYear(hits, +m[1], m[0].trim(), +(m[2] ?? 0));
  }
  //  3~5년 · 3-5년  → 큰 쪽을 쓴다
  for (const m of t.matchAll(/(\d{1,2})\s*[~\-–]\s*(\d{1,2})\s*년/g)) {
    if (!isDemand(t, m.index! + m[0].length)) pushYear(hits, +m[2], m[0].trim());
  }
  //  8 years · 8+ years of experience
  for (const m of t.matchAll(/(\d{1,2})\s*\+?\s*years?(?:\s+of)?(?:\s+experience)?/gi)) {
    pushYear(hits, +m[1], m[0].trim());
  }
  //  개월만 적은 경우 — 18개월 경력
  for (const m of t.matchAll(/(\d{1,3})\s*개월\s*(?:차|경력|경험)/g)) {
    const mo = +m[1];
    if (mo <= MAX_YEARS * 12 && !isDemand(t, m.index! + m[0].length)) {
      hits.push({ months: mo, why: m[0].trim() });
    }
  }

  if (hits.length) {
    //  가장 큰 값. 프로젝트별 기간을 더하면 겹치는 기간이 이중으로 세어진다.
    const best = hits.reduce((a, b) => (b.months > a.months ? b : a));
    return best;
  }
  //  숫자가 없으면 말로 적힌 것을 본다
  if (/(신입|취업\s*준비|부트캠프|졸업\s*예정|인턴만|경력\s*없)/.test(t)) {
    return { months: 0, why: '신입으로 적힘' };
  }
  return { months: 0, why: '연차를 찾지 못함' };
}
