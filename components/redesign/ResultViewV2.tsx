'use client';

// ============================================================================
//  ResultViewV2.tsx — Career Navi · 2026-09-17
//  '나의 커리어 분석' 결과 화면. 데이터·판단 규칙은 ResultView 와 같고 구성만 바꿨다.
//    1) 헤더 — 오버라인 + 제목 + 다시 하기
//    2) 출발점 카드 + 실제 추천 경로 3개를 그린 커리어 지도(CareerMapV2)
//    3) 탭: 추천 경로 / 내 역량 / 다른 직무 탐색
//  RankingTable · JobExplorer · ShareButton · JobRequirements 는 기존 것을 재사용한다.
// ============================================================================

import { useEffect, useId, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { isNewcomer, type AnalysisResult } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';
import RankingTable from '@/components/RankingTable';
import JobExplorer from '@/components/JobExplorer';
import ShareButton from '@/components/ShareButton';
import RouteAccordionV2 from './RouteAccordionV2';
import SkillGroupsV2 from './SkillGroupsV2';
// 지도는 로그인·로딩 화면과 같은 CareerMap 을 쓴다. 세 화면의 지도가 같은
// 그림이어야 "아까 본 그 지도에 내 결과가 찍혔다"로 읽힌다.
// 배치 계산(placeRoutes)만 V2 것을 가져온다 — 적합도로 거리를 정하는 규칙이라
// 범례의 "가까울수록 적합도가 높습니다"가 여기에 달려 있다.
import CareerMap from '@/components/CareerMap';
import { placeRoutes } from './CareerMapV2';

export default function ResultViewV2({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const { currentPosition, skills, routes } = result;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabId = useId();
  const [tab, setTab] = useState<'routes' | 'skills' | 'explore'>('routes');
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const mapRoutes = placeRoutes(routes.map((r) => {
    const d = jobDetailOf(r.destination, skills, r.requirements);
    return {
      id: r.id, name: r.destination, fit: r.fitScore / 100, hidden: r.isHiddenRoute,
      fill: d && d.mustTotal > 0 ? d.mustHeld / d.mustTotal : undefined,
      note: d ? `필수 ${d.mustHeld} / ${d.mustTotal}` : undefined,
    };
  }));
  const years = isNewcomer(currentPosition.careerMonths) ? '신입' : `${Math.floor(currentPosition.careerMonths / 12)}년차`;
  const skillCount = skills.filter((s) => s.quadrant !== 'noise').length;
  const TABS = [
    { key: 'routes', label: `추천 경로 ${routes.length}` },
    { key: 'skills', label: `내 역량 ${skillCount}` },
    { key: 'explore', label: '다른 직무 탐색' },
  ] as const;

  return (
    <div className="result-v2">
      <header className="result-head rv">
        <div>
          <span className="overline">My career analysis</span>
          <h1 ref={headingRef} tabIndex={-1} className="hd">나의 커리어 분석</h1>
          <p>입력한 경험에서 찾은 역량을 바탕으로 다음 커리어를 살펴보세요.</p>
        </div>
        <button type="button" onClick={onReset} className="btn btn-ghost btn-sm"><RotateCcw size={14} aria-hidden />다시 하기</button>
      </header>

      <section className="result-overview rv rv-2" aria-label="나의 출발점과 추천 경로 지도">
        <div className="start-card">
          <span className="overline">My starting point</span>
          <h2 className="hd">{currentPosition.jobTitle}</h2>
          <p className="start-meta">{years}{currentPosition.industry && ` · ${currentPosition.industry}`}</p>
          <p className="start-summary">{currentPosition.summary}</p>
          <ul className="start-stats">
            <li><b className="num">{skillCount}</b><span>확인된 역량</span></li>
            <li><b className="num">{routes.length}</b><span>추천 경로</span></li>
            <li><b className="num">{routes.filter((r) => r.isHiddenRoute).length}</b><span>몰랐던 길</span></li>
          </ul>
          <p className="start-note">입력된 경험을 바탕으로 한 탐색 결과입니다. 직무별 요구 역량과 근거를 함께 확인해주세요.</p>
        </div>
        <div className="map-card">
          {/* ⚠️ animated={false} 는 의도다. 로그인·로딩의 지도는 8초마다 다시 그리며
              "탐색 중"을 보여 주지만, 여기 찍힌 셋은 이미 확정된 추천 결과다.
              계속 다시 그리면 아직 계산 중인 값처럼 읽힌다. */}
          <CareerMap
            destinations={mapRoutes}
            originLabel={currentPosition.jobTitle}
            animated={false}
            animateBase={false}
            /* 기본 viewBox 는 히어로용 전체 지도라 이 카드에서는 위아래가 잘린다.
               'login' 은 내용에 맞춰 좁게 자른 크롭이라 카드에 들어맞고,
               로그인 화면과 같은 프레임이 되어 두 지도가 한 그림으로 읽힌다. */
            presentation="login"
            className="map-svg"
          />
          <div className="map-legend">
            <span><i className="teal" />추천 경로 · 링은 필수 역량 보유 비율</span>
            <span><i className="amber" />이 길도 있어요</span>
            <span className="far">가까울수록 적합도가 높습니다</span>
          </div>
        </div>
      </section>

      <div className="tabs-v2" role="tablist" aria-label="분석 결과">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" id={`${tabId}-${t.key}`} aria-selected={tab === t.key} aria-controls={`${tabId}-panel-${t.key}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div role="tabpanel" id={`${tabId}-panel-routes`} aria-labelledby={`${tabId}-routes`} hidden={tab !== 'routes'}>
        <div className="sec-title">
          <h2 className="hd">나의 경험과 연결되는 직무</h2>
          <p>보유 역량과 보완할 부분을 비교하고, 상세 보기에서 추천 근거를 확인하세요.</p>
        </div>
        <div className="route-list">
          {routes.map((route, i) => <RouteAccordionV2 key={route.id} route={route} mySkills={skills} rank={i + 1} />)}
        </div>
        {!routes.length && <p className="result-empty-v2">추천할 근거가 충분하지 않습니다. 다른 직무 탐색 탭에서 관심 직무를 살펴보거나 경험을 더 구체적으로 입력해주세요.</p>}
        {!!routes.length && (
          <details className="compare-v2">
            <summary>추천 직무의 역량 충족 현황 비교</summary>
            <RankingTable routes={routes} mySkills={skills} />
          </details>
        )}
      </div>
      <div role="tabpanel" id={`${tabId}-panel-skills`} aria-labelledby={`${tabId}-skills`} hidden={tab !== 'skills'}>
        <SkillGroupsV2 skills={skills} />
      </div>
      <div role="tabpanel" id={`${tabId}-panel-explore`} aria-labelledby={`${tabId}-explore`} hidden={tab !== 'explore'} className="explore-v2">
        <JobExplorer mySkills={skills} shownJobTitles={routes.map((r) => r.destination)} />
      </div>

      <ShareButton result={result} />
    </div>
  );
}
