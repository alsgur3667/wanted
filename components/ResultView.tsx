'use client';

import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { isNewcomer, type AnalysisResult } from '@/types';
import SkillGroups from './SkillGroups';
import RouteAccordion from './RouteAccordion';
import RankingTable from './RankingTable';
import JobExplorer from './JobExplorer';
import ShareButton from './ShareButton';
import ContentTabs from './ContentTabs';
import './result-view.css';

export default function ResultView({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const { currentPosition, skills, routes } = result;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="career-result">
      <header className="result-heading">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>나의 커리어 분석</h1>
          <p>입력한 경험에서 찾은 역량을 바탕으로 다음 커리어를 살펴보세요.</p>
        </div>
        <button type="button" onClick={onReset} className="result-reset"><RotateCcw size={14} aria-hidden />다시 하기</button>
      </header>
      <ContentTabs label="분석 결과" items={[
        { key: 'routes', label: `추천 경로 ${routes.length}`, content: <>
          <section className="starting-point" aria-label="나의 출발점">
            <div className="starting-point-top"><p className="result-eyebrow">MY STARTING POINT</p><h2>{currentPosition.jobTitle}</h2><p>{isNewcomer(currentPosition.careerMonths) ? '신입' : `${Math.floor(currentPosition.careerMonths / 12)}년차`}{currentPosition.industry && ` · ${currentPosition.industry}`}</p></div>
            <details><summary>내 경험 분석 요약 보기</summary><p>{currentPosition.summary}</p><p>입력된 경험을 바탕으로 한 탐색 결과입니다. 직무별 요구 역량과 근거를 함께 확인해주세요.</p></details>
          </section>
          <section className="result-section">
            <div className="result-section-heading"><h2>나의 경험과 연결되는 직무</h2><p>보유 역량과 보완할 부분을 비교하고, 상세 보기에서 추천 근거를 확인하세요.</p></div>
            <div className="result-route-list">{routes.map((route, index) => <RouteAccordion key={route.id} route={route} mySkills={skills} rank={index + 1} />)}</div>
            {!routes.length && <p className="result-empty">추천할 근거가 충분하지 않습니다. 다른 직무 탐색 탭에서 관심 직무를 살펴보거나 경험을 더 구체적으로 입력해주세요.</p>}
            {!!routes.length && <details className="result-comparison"><summary>추천 직무의 역량 충족 현황 비교</summary><RankingTable routes={routes} mySkills={skills} /></details>}
          </section>
        </>},
        { key: 'skills', label: `내 역량 ${skills.filter(skill => skill.quadrant !== 'noise').length}`, content: <section className="result-section result-skills"><SkillGroups skills={skills} /></section> },
        { key: 'explore', label: '다른 직무 탐색', content: <JobExplorer mySkills={skills} shownJobTitles={routes.map(route => route.destination)} /> },
      ]} />
      <ShareButton result={result} />
    </div>
  );
}
