'use client';

// ============================================================================
//  RouteAccordionV2.tsx — Career Navi · 2026-09-17
//  추천 경로 카드. 판단 규칙(jobDetailOf · 보유/보완 미리보기 · 적합도 숨김)은
//  RouteAccordion 과 같고, 시안의 번호(01·02·03) · 링 게이지 · 펼침 구성으로 바꿨다.
// ============================================================================

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Route, Skill } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';
import JobRequirements from '@/components/JobRequirements';

export default function RouteAccordionV2({ route, mySkills, rank }: { route: Route; mySkills: Skill[]; rank: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const detail = jobDetailOf(route.destination, mySkills, route.requirements);
  const requirements = detail ? [...detail.work, ...detail.tools] : [];
  const held = requirements.filter((r) => r.held).slice(0, 3);
  const gaps = requirements.filter((r) => r.isMust && !r.held).slice(0, 3);
  const ratio = detail && detail.mustTotal > 0 ? detail.mustHeld / detail.mustTotal : 0;
  const R = 22;
  const C = 2 * Math.PI * R;

  return (
    <article className={`route-v2${route.isHiddenRoute ? ' is-hidden-route' : ''}${open ? ' is-open' : ''}`}>
      <button type="button" className="route-head" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId}>
        <span className="num" aria-hidden>{String(rank).padStart(2, '0')}</span>
        <div className="route-main">
          <div className="route-title">
            {route.isHiddenRoute && <span className="route-badge">이 길도 있어요</span>}
            <h3>{route.destination}</h3>
            <span className="route-family">{route.jobFamily}</span>
          </div>
          <p className="route-one">{detail?.oneLiner || route.reason}</p>
          {detail && (
            <div className="route-preview-v2">
              <span className="held"><b>보유</b>{held.map((r) => r.name).join(' · ') || '확인된 역량 없음'}</span>
              <span className="gap"><b>보완</b>{gaps.map((r) => r.name).join(' · ') || (detail.mustHeld === detail.mustTotal ? '필수 역량 충족' : '상세 요구 역량 확인')}</span>
            </div>
          )}
        </div>
        <div className="route-side">
          {detail && detail.mustTotal > 0 && (
            <div className="ring" aria-hidden>
              <svg viewBox="0 0 56 56" width="56" height="56">
                <circle cx="28" cy="28" r={R} fill="none" stroke="var(--hairline)" strokeWidth="4" />
                <circle cx="28" cy="28" r={R} fill="none" stroke={route.isHiddenRoute ? 'var(--sun)' : 'var(--brand)'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${C * ratio} ${C}`} transform="rotate(-90 28 28)" />
              </svg>
              <b>{detail.mustHeld}<small>/{detail.mustTotal}</small></b>
            </div>
          )}
          <span className="route-summary">{detail ? '필수 역량 보유' : '추천 근거 확인'}</span>
          <span className="route-action"><ChevronDown size={14} aria-hidden />{open ? '상세 접기' : '상세 보기'}</span>
        </div>
      </button>
      <div id={panelId} className="collapsible" data-open={open} inert={!open}>
        <div>
          <div className="route-body">
            <div className="route-reason"><span className="overline">Why</span><p>{route.reason}</p></div>
            <dl className="route-facts">
              <div><dt>예상 준비</dt><dd>{route.estimatedMonths}개월</dd></div>
              <div><dt>난이도</dt><dd>{{ easy: '수월함', moderate: '보통', challenging: '도전적' }[route.difficulty]}</dd></div>
              {route.salaryBand && <div><dt>연봉 구간</dt><dd>{route.salaryBand}</dd></div>}
              {route.prospect && <div><dt>전망</dt><dd>{route.prospect}</dd></div>}
            </dl>
            {detail ? <JobRequirements detail={detail} /> : null}
            {route.gapSkills.length > 0 && (
              <section className="route-gaps">
                <h4>채워야 할 것과 첫 단계</h4>
                <ul>
                  {route.gapSkills.map((g) => (
                    <li key={g.name}>
                      <div className="gap-head"><span>{g.name}</span><i className="gap-track"><i style={{ width: `${Math.round(g.difficulty * 100)}%` }} /></i></div>
                      <p>{g.firstStep}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {route.marketNote && <p className="route-market">{route.marketNote}</p>}
          </div>
        </div>
      </div>
    </article>
  );
}
