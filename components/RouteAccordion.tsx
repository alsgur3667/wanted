'use client';

import { useId, useState } from 'react';
import type { Route, Skill } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';
import JobRequirements from './JobRequirements';

// ============================================================================
//  경로 하나 = 접힌 카드 하나. 눌러야 펼쳐진다.
//
//  전부 접힌 채로 시작한다 — 이 화면의 첫 메시지가
//  "너는 이 세 곳에 갈 수 있어" 하나로 떨어져야 하기 때문이다.
//
//  카드는 1px 헤어라인과 배경 한 단계로만 떠 있다. 그림자를 쓰지 않는다.
//  색은 히든 경로 배지 한 곳에만 허용한다 — 그 배지가 이 제품의 메시지다.
// ============================================================================

export default function RouteAccordion({
  route,
  mySkills,
  showFitScore = false,
}: {
  route: Route;
  mySkills: Skill[];
  /** 적합도 숫자 노출. 기본은 끈다 — 여러 요소가 섞인 값이라 맥락 없이 읽히면 오해가 된다 */
  showFitScore?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const detail = jobDetailOf(route.destination, mySkills, route.requirements);

  const summary = detail
    ? `필수 ${detail.mustTotal}개 중 ${detail.mustHeld}개`
    : `적합도 ${route.fitScore}`;

  // 히든 경로임을 테두리로도, 배지로도 말하면 같은 사실을 두 번 칠하는 것이다.
  // 목록에서 그 카드만 노랗게 뜨면 나머지 두 개가 덜 중요해 보이기도 한다.
  // 사실은 배지 하나가 말하고, 색은 마우스를 올린 카드에만 청록으로 켠다 —
  // 랜딩·예시 버튼과 같은 규칙이다.
  return (
    <article className="group overflow-hidden rounded-xl border border-hairline bg-elevated transition-colors hover:border-link/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={detail ? panelId : undefined}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-link-soft"
      >
        <div className="min-w-0">
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
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
          {showFitScore && (
            <span className="text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
              {route.fitScore}
            </span>
          )}
          <span className="whitespace-nowrap text-[12px] text-mute">{summary}</span>
          <span
            aria-hidden
            className={`text-[10px] text-faint transition-transform duration-[620ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </div>
      </button>

      {/* 내용을 조건부로 지우지 않는다 — 지우면 높이를 잴 수 없어 애니메이션이 안 된다.
          .collapsible 이 grid-template-rows 로 실제 높이를 계산해 접었다 편다. */}
      {detail && (
        <div id={panelId} className="collapsible" data-open={open} inert={!open} aria-hidden={!open}>
          <div>
            <div className="border-t border-hairline px-5 pb-5 pt-4">
              <JobRequirements detail={detail} />

              {route.marketNote && (
                <p className="mt-4 border-t border-hairline pt-3 text-[12px] leading-[1.6] text-faint">
                  {route.marketNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
