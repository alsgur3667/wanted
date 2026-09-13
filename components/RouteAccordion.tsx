'use client';

import { useId, useState } from 'react';
import type { Route, Skill } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';
import JobRequirements from './JobRequirements';

export default function RouteAccordion({
  route,
  mySkills,
  showFitScore = false,
  rank,
}: {
  route: Route;
  mySkills: Skill[];
  /** 적합도 숫자 노출. 기본은 끈다 — 여러 요소가 섞인 값이라 맥락 없이 읽히면 오해가 된다 */
  showFitScore?: boolean;
  rank?: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const detail = jobDetailOf(route.destination, mySkills, route.requirements);

  const summary = detail
    ? `필수 역량 ${detail.mustHeld} / ${detail.mustTotal}개 보유`
    : '추천 근거 확인';

  const requirements = detail ? [...detail.work, ...detail.tools] : [];
  const held = requirements.filter(row => row.held).slice(0, 2);
  const gaps = requirements.filter(row => row.isMust && !row.held).slice(0, 2);
  return (
    <article className="result-route group overflow-hidden rounded-xl border border-hairline bg-elevated transition-colors hover:border-link/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-hairline-soft"
      >
        <div className="min-w-0">
          {rank && <span className="result-route-rank">추천 경로 {String(rank).padStart(2, '0')}</span>}
          {route.isHiddenRoute && (
            <span className="mb-2 inline-block rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-medium text-warning">
              이 길도 있어요
            </span>
          )}
          <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {route.destination}
          </h3>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-body">
            {detail?.oneLiner || route.reason}
          </p>
          {detail && <div className="route-preview"><span className="route-held">✓ 보유 · {held.map(row => row.name).join(', ') || '확인된 역량 없음'}</span><span className="route-gap">＋ 보완 · {gaps.map(row => row.name).join(', ') || (detail.mustHeld === detail.mustTotal ? '필수 역량 충족' : '상세 요구 역량 확인')}</span></div>}
        </div>
        <div className="route-coverage shrink-0 pt-1">
          {showFitScore && (
            <span className="text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
              {route.fitScore}
            </span>
          )}
          <span className="whitespace-nowrap text-[12px] text-mute">{summary}</span>
          {detail && detail.mustTotal > 0 && <span className="coverage-track" aria-hidden="true"><span style={{width: `${Math.round(detail.mustHeld / detail.mustTotal * 100)}%`}} /></span>}
          <span className="route-detail-action">{open ? '상세 접기 −' : '상세 보기 ＋'}</span>

        </div>
      </button>

      {/* 내용을 조건부로 지우지 않는다 — 지우면 높이를 잴 수 없어 애니메이션이 안 된다.
          .collapsible 이 grid-template-rows 로 실제 높이를 계산해 접었다 편다. */}
        <div id={panelId} className="collapsible" data-open={open} inert={!open}>
          <div>
            <div className="border-t border-hairline px-5 pb-5 pt-4">
              {detail && <p className="mb-5 text-body leading-relaxed"><strong>추천 근거</strong><br />{route.reason}</p>}
              {detail ? <JobRequirements detail={detail} /> : <p className="text-sm leading-relaxed text-body">{route.reason}</p>}

              {route.marketNote && (
                <p className="mt-4 border-t border-hairline pt-3 text-[12px] leading-[1.6] text-faint">
                  {route.marketNote}
                </p>
              )}
            </div>
          </div>
        </div>
    </article>
  );
}
