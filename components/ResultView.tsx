'use client';

import { useEffect, useRef } from 'react';
import { ArrowDown, RotateCcw, Sparkles } from 'lucide-react';
import { isNewcomer, type AnalysisResult } from '@/types';
import SkillGroups from './SkillGroups';
import RouteAccordion from './RouteAccordion';
import RankingTable from './RankingTable';
import JobExplorer from './JobExplorer';
import ShareButton from './ShareButton';
import './result-view.css';

export default function ResultView({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const { currentPosition, skills, routes } = result;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  const strengths = skills.filter(skill => skill.quadrant === 'leverage').slice(0, 3);
  const highlights = strengths.length ? strengths : skills.filter(skill => skill.quadrant !== 'noise').slice(0, 3);
  return (
    <div className="career-result">
      <header className="result-heading">
        <div><p className="result-eyebrow">YOUR CAREER DIRECTIONS</p>
          <h1 ref={headingRef} tabIndex={-1}>경험은 이어지고,<br />선택지는 넓어집니다.</h1>
          <p>입력한 경험에서 찾은 역량을 바탕으로 다음 커리어를 살펴보세요.</p>
        </div>
        <button type="button" onClick={onReset} className="result-reset"><RotateCcw size={14} aria-hidden />다시 하기</button>
      </header>
      <nav className="result-navigation" aria-label="분석 결과 바로가기">
        <a href="#result-routes">추천 경로 <span>{routes.length}</span></a>
        <a href="#result-skills">내 역량 <span>{skills.length}</span></a>
        <a href="#result-explore">다른 직무 탐색 <ArrowDown size={13} aria-hidden /></a>
      </nav>
      <div className="result-layout">
        <aside className="result-summary" aria-label="내 경험 분석 요약">
          <p className="result-eyebrow">MY STARTING POINT</p>
          <h2>지금, 나의 출발점</h2>
          <p className="result-job-title">{currentPosition.jobTitle}</p>
          {!(isNewcomer(currentPosition.careerMonths) && currentPosition.jobTitle === '신입' && !currentPosition.industry) && <p className="result-career">{isNewcomer(currentPosition.careerMonths) ? '신입' : `${Math.floor(currentPosition.careerMonths / 12)}년차`}{currentPosition.industry && ` · ${currentPosition.industry}`}</p>}
          <p className="result-summary-copy">{currentPosition.summary}</p>
          <div className="result-highlights">
            <h3><Sparkles size={15} aria-hidden />{strengths.length ? '다른 직무에도 연결되는 강점' : '경험에서 확인한 역량'}</h3>
            {highlights.map(skill => <details key={skill.id}><summary>{skill.name}</summary><p>{skill.evidence || '입력한 경험에서 확인한 역량입니다.'}</p></details>)}
            {!highlights.length && <p className="result-summary-copy">구체적인 역할과 수행한 일을 추가하면 역량을 더 자세히 살펴볼 수 있습니다.</p>}
          </div>
          <p className="result-summary-note">입력된 경험을 바탕으로 한 탐색 결과입니다. 추천 직무의 요구 역량과 근거를 함께 확인해주세요.</p>
        </aside>
        <div className="result-main">
          <section id="result-routes" className="result-section">
            <div className="result-section-heading"><p className="result-eyebrow">01 · CAREER ROUTES</p><h2>나의 경험과 연결되는 직무</h2><p>추천 이유를 살펴보고, 각 직무를 펼쳐 보유 역량과 보완할 부분을 확인하세요.</p></div>
            <div className="result-route-list">{routes.map((route, index) => <RouteAccordion key={route.id} route={route} mySkills={skills} rank={index + 1} />)}</div>
            {!routes.length && <p className="result-empty">추천할 근거가 충분하지 않습니다. 아래에서 관심 직무를 직접 살펴보거나 경험을 더 구체적으로 입력해주세요.</p>}
            {!!routes.length && <details className="result-comparison"><summary>추천 직무의 역량 충족 현황 비교</summary><RankingTable routes={routes} mySkills={skills} /></details>}
          </section>
          <section id="result-explore" className="result-section result-explore"><p className="result-eyebrow">EXPLORE MORE</p><JobExplorer mySkills={skills} shownJobTitles={routes.map(route => route.destination)} /></section>
        </div>
      </div>
      <section id="result-skills" className="result-section result-skills"><p className="result-eyebrow">02 · MY SKILLS</p><SkillGroups skills={skills} /></section>
      <ShareButton result={result} />
    </div>
  );
}
