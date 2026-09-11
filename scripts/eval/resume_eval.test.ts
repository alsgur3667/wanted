/**
 * 이력서 테스트 — 이력서 원문을 넣어 추천 결과가 말이 되는지 본다.
 *
 *  실행: npm run eval:resumes
 *
 *  왜 mock 경로인가
 *    mockExtract 는 LLM 을 부르지 않는다. 사전에 있는 이름을 원문에서 찾고(findMentions),
 *    연차는 규칙으로 뽑고(extractCareerMonths), 직무명은 별칭으로 맞춘다(resolveJobTitle).
 *    API 키 없이 **누가 돌려도 같은 결과**가 나와야 비교가 되기 때문이다.
 *
 *  ⚠️ 이 테스트가 못 보는 것
 *    LLM 이 하는 판단(남의 얘기인지·희망사항인지 거르기, 서술형 문장에서 역량 뽑기)은
 *    빠져 있다. 즉 여기 결과는 **실제 서비스보다 보수적**이다. 여기서 못 잡은 역량이
 *    실제로도 못 잡힌다는 뜻은 아니다. 반대로 여기서 틀린 것은 LLM 이 있어도 틀린다 —
 *    순위·연차·직무 판정은 전부 코드가 하기 때문이다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mockExtract } from '@/lib/llm';
import { buildAnalysis } from '@/lib/scoring';

type Case = {
  id: string; label: string; why: string; resume: string;
  expectTop: string[]; mustNotTop: string[];
  expectMonths: number; monthsTolerance: number;
};

const CASES: Case[] = JSON.parse(
  readFileSync('scripts/eval/resume-cases.json', 'utf-8')
).cases;

describe('이력서 테스트', () => {
  it('12건', () => {
    const log = console.log;
    const lines: string[] = [];
    let passTop = 0, gradedTop = 0, passMonths = 0, hitNotTop = 0;

    for (const c of CASES) {
      console.log = () => {};                     // 파이프라인 로그를 죽인다
      const ex = mockExtract(c.resume);
      const res = buildAnalysis(ex);
      console.log = log;

      const routes = res.routes;
      const top = routes[0]?.destination ?? '(없음)';
      const months = ex.currentPosition.careerMonths ?? 0;

      const okTop = c.expectTop.length === 0 ? null : c.expectTop.includes(top);
      const bad = c.mustNotTop.includes(top);
      const okMonths = Math.abs(months - c.expectMonths) <= c.monthsTolerance;
      if (okTop !== null) { gradedTop++; if (okTop) passTop++; }
      if (bad) hitNotTop++;
      if (okMonths) passMonths++;

      const mark = (b: boolean | null) => (b === null ? '—' : b ? 'O' : 'X');
      lines.push(
        `\n[${c.id}] ${c.label}`
        + `\n  1위 ${mark(okTop)} ${top}`
        + (c.expectTop.length ? `   (기대: ${c.expectTop.join(' 또는 ')})` : '')
        + (bad ? '   ⛔ 나오면 안 되는 것이 1위다' : '')
        + `\n  연차 ${mark(okMonths)} ${months}개월   (기대: ${c.expectMonths}±${c.monthsTolerance})`
        + `\n  읽은 직무: ${ex.currentPosition.jobTitle} / ${ex.currentPosition.jobFamily}`
        + `\n  찾은 역량 ${ex.skillCandidates.length}개: `
        + ex.skillCandidates.map((s) => s.name).join(', ')
        + `\n  경로: ` + routes
          .map((r) => `${r.destination}(${r.fitScore})${r.isHiddenRoute ? '★' : ''}`).join(' → ')
      );
    }

    console.log(lines.join('\n'));
    console.log(
      `\n${'='.repeat(60)}`
      + `\n1위 적중 ${passTop}/${gradedTop}`
      + `  ·  연차 적중 ${passMonths}/${CASES.length}`
      + `  ·  금지 직무가 1위 ${hitNotTop}건`
      + `\n${'='.repeat(60)}`
    );
    expect(CASES.length).toBeGreaterThan(0);
  }, 300000);
});
