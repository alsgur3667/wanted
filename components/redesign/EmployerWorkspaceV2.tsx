'use client';

// ============================================================================
//  EmployerWorkspaceV2.tsx — Career Navi · 2026-09-17
//  기업 워크스페이스. 상태·필터·매칭 로직은 EmployerWorkspace 와 같고 구성만 바꿨다.
//    상단: 회사 · 공고 선택 밴드 → KPI 4개 → 전형 단계 필 → 검색·필터
//    본문: 후보 목록(카드 V2) | 후보 상세(V2)
//  '새 공고 만들기'는 기존 PostingComposer 를 그대로 쓴다(스타일만 CSS 로 맞춤).
// ============================================================================

import { useRef, useState } from 'react';
import { ChevronDown, FilePenLine, Search, UsersRound } from 'lucide-react';
import CompanyMarkV2 from './CompanyMarkV2';
import EmployerCandidateCardV2 from './EmployerCandidateCardV2';
import EmployerCandidateDetailV2 from './EmployerCandidateDetailV2';
import PostingComposer from '@/components/PostingComposer';
import { APPLICATION_STAGE_LABEL, APPLICATION_STAGES, CANDIDATE_APPLICATIONS, COMPANIES, matchesForPosting, postingsForCompany } from '@/lib/employer-index';
import { companyById, postingById, skillNames } from '@/lib/company-index';
import { isNewcomer } from '@/types';
import type { ApplicationStage } from '@/types';

type SeniorityFilter = 'all' | 'new' | 'experienced';
type StageFilter = 'all' | ApplicationStage;
type WorkspaceMode = 'applications' | 'create';

export default function EmployerWorkspaceV2() {
  const detailRef = useRef<HTMLDivElement>(null);
  function revealDetail() {
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => { detailRef.current?.scrollIntoView({ block: 'start' }); detailRef.current?.focus({ preventScroll: true }); });
  }
  const [mode, setMode] = useState<WorkspaceMode>('applications');
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [postingId, setPostingId] = useState(postingsForCompany(COMPANIES[0].id)[0].id);
  const [stageByApplication, setStageByApplication] = useState<Record<string, ApplicationStage>>(() =>
    Object.fromEntries(CANDIDATE_APPLICATIONS.map((a) => [a.id, a.stage]))
  );
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [seniority, setSeniority] = useState<SeniorityFilter>('all');
  const [includeDifferentRole, setIncludeDifferentRole] = useState(true);
  const [minimumFit, setMinimumFit] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const company = companyById(companyId)!;
  const postings = postingsForCompany(companyId);
  const posting = postingById(postingId) ?? postings[0];
  const allMatches = matchesForPosting(posting.id).map((m) => ({ ...m, application: { ...m.application, stage: stageByApplication[m.application.id] ?? m.application.stage } }));
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  const matches = allMatches.filter((m) => {
    const newcomer = isNewcomer(m.candidate.careerMonths);
    const careerOk = seniority === 'all' || (seniority === 'new' ? newcomer : !newcomer);
    const stageOk = stageFilter === 'all' || m.application.stage === stageFilter;
    const roleOk = includeDifferentRole || !m.isDifferentRole;
    const target = [m.candidate.alias, m.candidate.currentJobTitle, ...skillNames(m.candidate.skillIds)].join(' ').toLocaleLowerCase('ko-KR');
    return careerOk && stageOk && roleOk && m.fitScore >= minimumFit && (!normalized || target.includes(normalized));
  });
  const selected = matches.find((m) => m.application.id === selectedId) ?? matches[0];
  const count = (pred: (s: ApplicationStage) => boolean) => allMatches.filter((m) => pred(m.application.stage)).length;

  function resetFilters() { setQuery(''); setStageFilter('all'); setSeniority('all'); setMinimumFit(0); setIncludeDifferentRole(true); }
  function changeCompany(next: string) { resetFilters(); setCompanyId(next); setPostingId(postingsForCompany(next)[0].id); setSelectedId(null); }

  return (
    <div className="emp-workspace">
      <nav className="emp-modes" aria-label="기업 채용 기능">
        <button type="button" aria-pressed={mode === 'applications'} onClick={() => setMode('applications')}><UsersRound size={16} aria-hidden />지원자 관리</button>
        <button type="button" aria-pressed={mode === 'create'} onClick={() => setMode('create')}><FilePenLine size={16} aria-hidden />새 공고 만들기</button>
      </nav>

      {mode === 'create' ? (
        <>
          <section className="emp-context rv">
            <CompanyMarkV2 company={company} size="lg" />
            <div className="emp-context-text"><span className="overline">가상 채용 계정</span><h2 className="hd">{company.name}</h2><p>{company.industry} · {company.employeeCountRange}</p></div>
            <label className="sel"><span>작성 회사</span><select value={companyId} onChange={(e) => changeCompany(e.target.value)}>{COMPANIES.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.industry}</option>)}</select><ChevronDown size={16} className="chev" aria-hidden /></label>
          </section>
          <div className="emp-composer"><PostingComposer key={company.id} company={company} /></div>
        </>
      ) : (
        <>
          <section className="emp-context rv">
            <CompanyMarkV2 company={company} size="lg" />
            <div className="emp-context-text"><span className="overline">Hiring workspace</span><h2 className="hd">{company.name}</h2><p>{posting.title}</p></div>
            <div className="emp-selects">
              <label className="sel"><span>회사</span><select value={companyId} onChange={(e) => changeCompany(e.target.value)}>{COMPANIES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><ChevronDown size={16} className="chev" aria-hidden /></label>
              <label className="sel"><span>채용공고</span><select value={posting.id} onChange={(e) => { setPostingId(e.target.value); setSelectedId(null); resetFilters(); }}>{postings.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select><ChevronDown size={16} className="chev" aria-hidden /></label>
            </div>
          </section>

          <ul className="emp-kpis rv rv-2">
            {([
              ['전체 지원', allMatches.length, ''],
              ['진행 중', count((s) => !['rejected', 'hold'].includes(s)), 'is-accent'],
              ['신규 지원', count((s) => s === 'new'), ''],
              ['면접 진행', count((s) => s === 'interview'), ''],
            ] as const).map(([label, value, cls]) => (
              <li key={label} className={cls}><span>{label}</span><b className="num">{value}</b><small>명</small></li>
            ))}
          </ul>

          <div className="emp-stages rv rv-3" aria-label="전형 상태별 지원자">
            <button type="button" aria-pressed={stageFilter === 'all'} onClick={() => setStageFilter('all')}>전체 <b>{allMatches.length}</b></button>
            {APPLICATION_STAGES.map((s) => <button key={s} type="button" aria-pressed={stageFilter === s} onClick={() => setStageFilter(s)}>{APPLICATION_STAGE_LABEL[s]} <b>{count((x) => x === s)}</b></button>)}
          </div>

          <section className="emp-filters rv rv-3" aria-label="지원자 찾기">
            <div className="search"><Search size={16} aria-hidden /><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="후보 검색" placeholder="이름·직무·역량 검색" /></div>
            <label className="sel"><select value={seniority} onChange={(e) => setSeniority(e.target.value as SeniorityFilter)} aria-label="경력 필터"><option value="all">전체 경력</option><option value="experienced">경력</option><option value="new">신입</option></select><ChevronDown size={16} className="chev" aria-hidden /></label>
            <label className="sel"><select value={minimumFit} onChange={(e) => setMinimumFit(Number(e.target.value))} aria-label="최소 적합도"><option value={0}>전체 적합도</option><option value={40}>40점 이상</option><option value={60}>60점 이상</option><option value={80}>80점 이상</option></select><ChevronDown size={16} className="chev" aria-hidden /></label>
            <label className="check"><input type="checkbox" checked={includeDifferentRole} onChange={(e) => setIncludeDifferentRole(e.target.checked)} />직무명이 다른 역량 전환 후보 포함</label>
            <button type="button" className="textlink" onClick={resetFilters}>필터 초기화</button>
          </section>

          <div className="emp-body rv rv-4">
            <section id="applicant-list-v2" className="emp-list">
              <div className="emp-list-head"><h2><UsersRound size={16} aria-hidden />후보 {matches.length}명</h2><span>적합도 높은 순</span></div>
              <div className="emp-cards">
                {matches.map((m) => <EmployerCandidateCardV2 key={m.application.id} match={m} selected={selected?.application.id === m.application.id} onSelect={() => { setSelectedId(m.application.id); revealDetail(); }} />)}
                {matches.length === 0 && <div className="emp-empty"><p>현재 조건에 맞는 후보가 없습니다.</p><button type="button" className="textlink" onClick={resetFilters}>필터 초기화</button></div>}
              </div>
            </section>
            {selected ? (
              <div ref={detailRef} tabIndex={-1} className="emp-detail-anchor">
                <a href="#applicant-list-v2" className="emp-back-list">← 지원자 목록으로</a>
                <EmployerCandidateDetailV2 match={selected} onStageChange={(stage) => setStageByApplication((cur) => ({ ...cur, [selected.application.id]: stage }))} />
              </div>
            ) : (
              <aside className="emp-empty">왼쪽에서 후보를 선택해 주세요.</aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
