'use client';

import { useState } from 'react';
import { BriefcaseBusiness, ChevronRight, FilePenLine, MapPin, UsersRound } from 'lucide-react';
import CompanyMark from '@/components/CompanyMark';
import EmployerCandidateCard from '@/components/EmployerCandidateCard';
import EmployerCandidateDetail from '@/components/EmployerCandidateDetail';
import PostingComposer from '@/components/PostingComposer';
import {
  APPLICATION_STAGE_LABEL,
  APPLICATION_STAGES,
  CANDIDATE_APPLICATIONS,
  COMPANIES,
  matchesForPosting,
  postingsForCompany,
} from '@/lib/employer-index';
import { careerLabel, companyById, postingById, skillNames, WORK_MODE_LABEL } from '@/lib/company-index';
import { isNewcomer } from '@/types';
import type { ApplicationStage } from '@/types';


type SeniorityFilter = 'all' | 'new' | 'experienced';
type StageFilter = 'all' | ApplicationStage;
type WorkspaceMode = 'applications' | 'create';

const CONTROL_CLASS = 'min-h-11 w-full rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink transition-colors placeholder:text-faint focus:border-link';
const FILTER_CLASS = 'min-h-11 min-w-0 rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm text-ink transition-colors focus:border-link';

export default function EmployerWorkspace() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('applications');
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [postingId, setPostingId] = useState(postingsForCompany(COMPANIES[0].id)[0].id);
  const [stageByApplication, setStageByApplication] = useState<Record<string, ApplicationStage>>(() =>
    Object.fromEntries(CANDIDATE_APPLICATIONS.map((application) => [application.id, application.stage]))
  );
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [seniority, setSeniority] = useState<SeniorityFilter>('all');
  const [includeDifferentRole, setIncludeDifferentRole] = useState(true);
  const [minimumFit, setMinimumFit] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const company = companyById(companyId)!;
  const postings = postingsForCompany(companyId);
  const posting = postingById(postingId) ?? postings[0];
  const allMatches = matchesForPosting(posting.id).map((match) => ({
    ...match,
    application: {
      ...match.application,
      stage: stageByApplication[match.application.id] ?? match.application.stage,
    },
  }));
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  const matches = allMatches.filter((match) => {
    const newcomer = isNewcomer(match.candidate.careerMonths);
    const careerMatches = seniority === 'all' || (seniority === 'new' ? newcomer : !newcomer);
    const stageMatches = stageFilter === 'all' || match.application.stage === stageFilter;
    const roleMatches = includeDifferentRole || !match.isDifferentRole;
    const target = [match.candidate.alias, match.candidate.currentJobTitle, ...skillNames(match.candidate.skillIds)]
      .join(' ').toLocaleLowerCase('ko-KR');
    return careerMatches && stageMatches && roleMatches && match.fitScore >= minimumFit
      && (!normalized || target.includes(normalized));
  });

  const selected = matches.find((match) => match.application.id === selectedApplicationId) ?? matches[0];
  const differentRoleCount = allMatches.filter((match) => match.isDifferentRole).length;
  const activeCount = allMatches.filter((match) => !['rejected', 'hold'].includes(match.application.stage)).length;
  const averageFit = Math.round(allMatches.reduce((sum, match) => sum + match.fitScore, 0) / Math.max(1, allMatches.length));

  function changeCompany(nextCompanyId: string) {
    const nextPostings = postingsForCompany(nextCompanyId);
    setCompanyId(nextCompanyId);
    setPostingId(nextPostings[0].id);
    setSelectedApplicationId(null);
  }

  function resetFilters() {
    setQuery('');
    setStageFilter('all');
    setSeniority('all');
    setMinimumFit(0);
    setIncludeDifferentRole(true);
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="기업 채용 기능" className="flex rounded-xl border border-hairline bg-elevated p-1">
          <button type="button" aria-pressed={workspaceMode === 'applications'} onClick={() => setWorkspaceMode('applications')} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm transition-colors ${workspaceMode === 'applications' ? 'bg-ink font-medium text-elevated' : 'text-mute hover:text-ink'}`}><UsersRound className="size-4" />지원자 관리</button>
          <button type="button" aria-pressed={workspaceMode === 'create'} onClick={() => setWorkspaceMode('create')} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm transition-colors ${workspaceMode === 'create' ? 'bg-ink font-medium text-elevated' : 'text-mute hover:text-ink'}`}><FilePenLine className="size-4" />새 공고 만들기</button>
        </nav>
        <span className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mute">데모 환경 · 변경사항은 저장되지 않습니다</span>
      </div>

      {workspaceMode === 'create' ? (
        <>
          <section className="animate-rise rounded-xl border border-hairline bg-elevated p-5">
            <div className="flex flex-wrap items-center gap-3">
              <CompanyMark company={company} />
              <div className="min-w-0 flex-1"><p className="text-[11px] uppercase tracking-wider text-faint">가상 채용 계정</p><p className="mt-0.5 text-[14px] font-semibold tracking-[-0.02em] text-ink">{company.name}</p></div>
              <label className="w-full text-[10px] font-medium text-mute sm:w-auto sm:min-w-[220px]">작성 회사
                <select value={companyId} onChange={(event) => changeCompany(event.target.value)} className={`mt-1 ${CONTROL_CLASS}`}>
                  {COMPANIES.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.industry}</option>)}
                </select>
              </label>
            </div>
          </section>
          <PostingComposer key={company.id} company={company} />
        </>
      ) : (
        <>
      <section className="animate-rise rounded-xl border border-hairline bg-elevated p-5">
        <div className="flex items-center gap-3">
          <CompanyMark company={company} />
          <div><p className="text-[11px] uppercase tracking-wider text-faint">가상 채용 계정</p><p className="mt-0.5 text-[14px] font-semibold tracking-[-0.02em] text-ink">{company.name}</p></div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-[11px] font-medium text-mute">회사 선택
            <select value={companyId} onChange={(event) => changeCompany(event.target.value)} className={`mt-2 ${CONTROL_CLASS}`}>
              {COMPANIES.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.industry}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-medium text-mute">채용공고 선택
            <select value={posting.id} onChange={(event) => { setPostingId(event.target.value); setSelectedApplicationId(null); }} className={`mt-2 ${CONTROL_CLASS}`}>
              {postings.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-4 text-[11px] text-mute">
          <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="size-3.5" />{careerLabel(posting)} · {posting.employmentType}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{posting.location} · {WORK_MODE_LABEL[posting.workMode]}</span>
          <span>필수 {posting.mustSkillIds.length}개 · 우대 {posting.niceSkillIds.length}개</span>
        </div>
      </section>

      <section className="animate-rise mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ animationDelay: '100ms' }}>
        {[
          ['전체 지원', `${allMatches.length}명`], ['진행 중', `${activeCount}명`],
          ['직무 전환 후보', `${differentRoleCount}명`], ['평균 적합도', `${averageFit}점`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-hairline bg-elevated px-5 py-5">
            <p className="text-xs text-mute">{label}</p><p className="mt-3 text-3xl font-semibold tabular-nums tracking-[-0.02em] text-ink">{value}</p>
          </div>
        ))}
      </section>

      <section className="animate-rise mt-5 rounded-xl border border-hairline bg-elevated p-4" style={{ animationDelay: '180ms' }}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-ink">지원자 검색 및 필터</h2><button type="button" onClick={resetFilters} className="min-h-9 rounded-md px-2 text-xs text-link hover:bg-link-soft">필터 초기화</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="후보 검색" placeholder="이름·직무·역량 검색" className={`${FILTER_CLASS} placeholder:text-faint lg:col-span-2`} />
          <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as StageFilter)} aria-label="전형 상태 필터" className={FILTER_CLASS}>
            <option value="all">전체 상태</option>{APPLICATION_STAGES.map((stage) => <option key={stage} value={stage}>{APPLICATION_STAGE_LABEL[stage]}</option>)}
          </select>
          <select value={seniority} onChange={(event) => setSeniority(event.target.value as SeniorityFilter)} aria-label="경력 필터" className={FILTER_CLASS}>
            <option value="all">전체 경력</option><option value="experienced">경력</option><option value="new">신입</option>
          </select>
          <select value={minimumFit} onChange={(event) => setMinimumFit(Number(event.target.value))} aria-label="최소 적합도" className={FILTER_CLASS}>
            <option value={0}>전체 적합도</option><option value={40}>40점 이상</option><option value={60}>60점 이상</option><option value={80}>80점 이상</option>
          </select>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-body">
          <input type="checkbox" checked={includeDifferentRole} onChange={(event) => setIncludeDifferentRole(event.target.checked)} className="size-3.5 accent-[var(--link)]" />직무명이 다른 역량 전환 후보 포함
        </label>
      </section>

      <div className="animate-rise mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]" style={{ animationDelay: '260ms' }}>
        <section>
          <div className="flex items-center justify-between">
            <h2 aria-live="polite" className="inline-flex items-center gap-2 text-[14px] font-semibold tracking-[-0.02em] text-ink"><UsersRound className="size-4" />후보 {matches.length}명</h2>
            <span className="text-[10px] text-faint">적합도 높은 순</span>
          </div>
          <div className="mt-3 space-y-3">
            {matches.map((match) => (
              <div key={match.application.id}>
                <EmployerCandidateCard match={match} selected={selected?.application.id === match.application.id} onSelect={() => setSelectedApplicationId(match.application.id)} />
                {selectedApplicationId === match.application.id && <div className="mt-3 lg:hidden"><EmployerCandidateDetail match={match} onStageChange={(stage) => setStageByApplication((current) => ({ ...current, [match.application.id]: stage }))} /></div>}
              </div>
            ))}
            {matches.length === 0 && (
              <div className="rounded-xl border border-hairline p-10 text-center">
                <p className="text-sm text-mute">현재 조건에 맞는 후보가 없습니다.</p>
                <button type="button" onClick={resetFilters} className="mt-3 inline-flex items-center gap-1 text-[12px] text-link">필터 초기화 <ChevronRight className="size-3" /></button>
              </div>
            )}
          </div>
        </section>
        {selected ? (
          <div className="hidden lg:sticky lg:top-24 lg:block"><EmployerCandidateDetail match={selected} onStageChange={(stage) => setStageByApplication((current) => ({ ...current, [selected.application.id]: stage }))} /></div>
        ) : (
          <aside className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-mute">왼쪽에서 후보를 선택해 주세요.</aside>
        )}
      </div>
        </>
      )}
    </div>
  );
}
