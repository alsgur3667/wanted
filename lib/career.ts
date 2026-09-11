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

/** 이 표현이 가까이 있으면 근무 기간이 아니라 **학력 기간**이다 */
const EDU_NEAR = /(대학교|대학원|학사|석사|박사|졸업|휴학|고등학교|학과|전공|수료|교육과정|부트캠프)/;

/** "2018.03 ~ 현재" 같은 기간을 [시작월, 끝월] 로 모은다. 월은 1970-01 기준 통월수. */
function collectPeriods(text: string): [number, number][] {
  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const out: [number, number][] = [];
  const re =
    /(\d{4})\s*[.\-/년]\s*(\d{1,2})?\s*월?\s*[~\-–—]\s*(현재|재직\s*중|present|now|(\d{4})\s*[.\-/년]\s*(\d{1,2})?\s*월?)/gi;

  for (const m of text.matchAll(re)) {
    //  앞뒤를 같이 본다 — 학력 기간은 "2014.03 ~ 2018.02 OO대학교" 처럼 뒤에 붙고
    //  "학력 2014.03 ~" 처럼 앞에 붙기도 한다.
    //
    //  ⚠️ 문맥 창이 **줄을 넘어가면 안 된다.** 넘어가면 윗줄의 학력 기간에 적힌
    //     '졸업' 때문에 아랫줄의 근무 기간까지 같이 버려진다. 실측으로 걸렸다 —
    //     "2014.03~2018.02 한국대학교 졸업 / 2018.03~현재 A사" 가 통째로 0개월이 됐다.
    const s0 = m.index!;
    const e0 = s0 + m[0].length;
    const lineStart = Math.max(text.lastIndexOf('\n', s0) + 1, s0 - 20);
    const nl = text.indexOf('\n', e0);
    const lineEnd = Math.min(nl === -1 ? text.length : nl, e0 + 24);
    const around = text.slice(lineStart, s0) + text.slice(e0, lineEnd);
    if (EDU_NEAR.test(around) || DEMAND_NEAR.test(around)) continue;

    const y1 = +m[1];
    const mo1 = m[2] ? +m[2] : 1;
    if (y1 < 1970 || mo1 < 1 || mo1 > 12) continue;
    const start = y1 * 12 + (mo1 - 1);

    let end: number;
    if (m[4]) {
      const y2 = +m[4];
      const mo2 = m[5] ? +m[5] : 12;
      if (y2 < 1970 || mo2 < 1 || mo2 > 12) continue;
      end = y2 * 12 + (mo2 - 1);
    } else {
      end = nowIdx;                       // 현재·재직 중
    }
    if (end < start || start > nowIdx) continue;
    out.push([start, end + 1]);           // 끝 달도 근무한 것으로 센다
  }
  return out;
}

/** 겹치는 구간을 합쳐 총 개월수를 센다. */
function unionMonths(periods: [number, number][]): number {
  const sorted = [...periods].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = sorted[0];
  for (const [s, e] of sorted.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else { total += ce - cs; [cs, ce] = [s, e]; }
  }
  return total + (ce - cs);
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

  //  2018.03 ~ 현재 · 2018.03 ~ 2024.05 · 2018년 3월 ~ 현재
  //
  //  연차를 숫자로 안 적고 기간만 적는 이력서가 흔하다. 이걸 못 읽으면
  //  8년차가 신입으로 처리돼 경력 보정에서 깎인다.
  //
  //  ⚠️ 여기서는 **겹치는 구간을 합쳐서 더한다.** 위의 '가장 큰 값' 규칙과 다르다.
  //     회사 세 곳을 3년씩 다녔으면 총 9년이지 3년이 아니다. 경력 기간은 대개
  //     순차적이라 합쳐도 이중으로 세어지지 않는다. 겹친 부분은 병합해서 한 번만 센다.
  const periods = collectPeriods(text);   // 줄바꿈이 살아 있는 원문
  if (periods.length) {
    const months = unionMonths(periods);
    if (months > 0 && months <= MAX_YEARS * 12) {
      hits.push({ months, why: `근무 기간 ${periods.length}건을 합산` });
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
