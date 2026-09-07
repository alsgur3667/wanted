'use client';

import { useState } from 'react';
import type { Route, Skill } from '@/types';
import { jobDetailOf, LOW_CONFIDENCE, type RequirementRow } from '@/lib/job-detail';

// ============================================================================
//  경로 하나 = 접힌 카드 하나. 눌러야 펼쳐진다.
//
//  전부 접힌 채로 시작한다 — 이 화면의 첫 메시지가
//  "너는 이 세 곳에 갈 수 있어" 하나로 떨어져야 하기 때문이다.
// ============================================================================

function RequirementList({ rows, sampleSize }: { rows: RequirementRow[]; sampleSize: number }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.skillId} className="flex items-start gap-2">
          <span
            aria-hidden
            className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[9px] leading-none ${
              r.held
                ? 'border-emerald-500/70 text-emerald-600 dark:text-emerald-400'
                : r.coveredVia
                  ? 'border-emerald-500/35 text-emerald-600/60 dark:text-emerald-400/60'
                  : 'border-black/20 text-transparent dark:border-white/25'
            }`}
          >
            ✓
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm">{r.name}</span>
              {r.isMust && (
                <span className="rounded bg-black/[0.06] px-1 py-px text-[10px] opacity-60 dark:bg-white/10">
                  필수
                </span>
              )}
              <span className="ml-auto shrink-0 text-[11px] tabular-nums opacity-45">
                {r.docFreq}/{sampleSize}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed opacity-60">
              {r.held
                ? `내 이력서 — "${r.evidence}"`
                : r.coveredVia
                  ? `같은 계열의 다른 것을 갖고 있어요 — ${r.coveredVia}`
                  : `첫 단계 — ${r.firstStep}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function RouteAccordion({
  route,
  mySkills,
}: {
  route: Route;
  mySkills: Skill[];
}) {
  const [open, setOpen] = useState(false);
  const detail = jobDetailOf(route.destination, mySkills);

  const summary = detail
    ? `필수 ${detail.mustTotal}개 중 ${detail.mustHeld}개`
    : `적합도 ${route.fitScore}`;

  return (
    <article
      className={`overflow-hidden rounded-2xl border transition ${
        route.isHiddenRoute
          ? 'border-amber-400/60 bg-amber-400/[0.06]'
          : 'border-black/10 dark:border-white/10'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
      >
        <div className="min-w-0">
          {route.isHiddenRoute && (
            <span className="mb-1.5 inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
              이 길도 있어요
            </span>
          )}
          <h3 className="text-lg font-semibold leading-tight">{route.destination}</h3>
          <p className="mt-1 text-sm leading-relaxed opacity-65">
            {detail?.oneLiner || route.reason}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pt-0.5">
          <span className="whitespace-nowrap text-xs opacity-60">{summary}</span>
          <span
            aria-hidden
            className={`text-xs opacity-40 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </div>
      </button>

      {open && detail && (
        <div className="border-t border-black/[0.07] px-5 pb-5 pt-4 dark:border-white/[0.08]">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-sm font-medium">이 직무에 필요한 것</h4>
            <span className="text-[11px] opacity-45">공고 {detail.sampleSize}건 기준</span>
          </div>

          {/* 표본이 얇은 직무는 요구 역량 자체를 믿기 어렵다 (이슈 #21).
              숫자를 감추는 대신 어느 정도로 믿을 수 있는지 함께 적는다. */}
          {detail.confidence < LOW_CONFIDENCE && (
            <p className="mt-2 rounded-lg border border-dashed border-amber-400/40 px-3 py-2 text-[11px] leading-relaxed opacity-70">
              공고 표본이 {detail.sampleSize}건으로 적어, 아래 목록은 한두 회사의 공고에 크게 기울어 있을 수
              있습니다.
            </p>
          )}

          <div className="mt-3.5 grid gap-x-7 gap-y-5 sm:grid-cols-[1.4fr_1fr]">
            {detail.work.length > 0 && (
              <section>
                <h5 className="mb-2.5 text-xs opacity-45">하는 일</h5>
                <RequirementList rows={detail.work} sampleSize={detail.sampleSize} />
              </section>
            )}

            {detail.tools.length > 0 && (
              <section
                className={
                  detail.work.length > 0
                    ? 'sm:border-l sm:border-black/[0.07] sm:pl-6 sm:dark:border-white/[0.08]'
                    : 'sm:col-span-2'
                }
              >
                <h5 className="mb-2.5 text-xs opacity-45">쓰는 도구·기술</h5>
                <RequirementList rows={detail.tools} sampleSize={detail.sampleSize} />
              </section>
            )}
          </div>

          {/* 회사명은 아직 공고 데이터에 없다. 자리를 먼저 두고 건수만 사실대로 쓴다.
              없는 회사명을 지어 넣으면 나머지 숫자의 신뢰도까지 함께 잃는다. */}
          <div className="mt-5 border-t border-black/[0.07] pt-3.5 dark:border-white/[0.08]">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="text-sm font-medium">이 직무를 모집 중인 기업</h4>
              <span className="text-xs opacity-60">공고 {detail.sampleSize}건</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-45">
              분석에 쓴 공고 {detail.sampleSize}건에서 뽑은 요구 역량입니다. 회사명과 공고 링크는 준비 중입니다.
            </p>
          </div>

          {route.marketNote && (
            <p className="mt-4 border-t border-black/5 pt-3 text-xs opacity-55 dark:border-white/5">
              {route.marketNote}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
