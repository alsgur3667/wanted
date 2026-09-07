'use client';

import { useState } from 'react';
import type { Route, Skill } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';
import JobRequirements from './JobRequirements';

// ============================================================================
//  경로 하나 = 접힌 카드 하나. 눌러야 펼쳐진다.
//
//  전부 접힌 채로 시작한다 — 이 화면의 첫 메시지가
//  "너는 이 세 곳에 갈 수 있어" 하나로 떨어져야 하기 때문이다.
// ============================================================================

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
          <JobRequirements detail={detail} />

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
