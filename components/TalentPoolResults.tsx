'use client';

import { useMemo, useRef, useState } from 'react';
import { Search, Sparkles, UserRoundSearch } from 'lucide-react';
import { skillNames, WORK_MODE_LABEL } from '@/lib/company-index';
import { talentMatchesForDraft } from '@/lib/employer-index';
import { getSkill } from '@/lib/skill-index';
import { isNewcomer } from '@/types';
import type { PostingDraft } from '@/types';

const FILTER_CLASS = 'rounded-md border border-hairline bg-canvas px-3 py-2 text-[12px] text-ink outline-none transition-colors focus:border-link';

export default function TalentPoolResults({ draft }: { draft: PostingDraft }) {
  const detailRef = useRef<HTMLElement>(null);
  function selectCandidate(id: string) { setSelectedId(id); if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => { detailRef.current?.scrollIntoView({block: 'start'}); detailRef.current?.focus({preventScroll: true}); }); }
  const allMatches = useMemo(() => talentMatchesForDraft(draft), [draft]);
  const [query, setQuery] = useState('');
  const [minimumFit, setMinimumFit] = useState(40);
  const [includeDifferentRole, setIncludeDifferentRole] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  const matches = allMatches.filter((match) => {
    const target = [match.candidate.alias, match.candidate.currentJobTitle, ...skillNames(match.candidate.skillIds)]
      .join(' ').toLocaleLowerCase('ko-KR');
    return match.fitScore >= minimumFit
      && (includeDifferentRole || !match.isDifferentRole)
      && (!normalized || target.includes(normalized));
  }).slice(0, 18);
  const selected = matches.find((match) => match.candidate.id === selectedId) ?? matches[0];

  return (
    <section className="animate-rise mt-8 border-t border-hairline pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-link"><Sparkles className="size-3.5" />가상 인재풀 추천</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-ink">아직 지원하지 않은 추천 인재</h2>
          <p className="mt-1 text-[11px] text-mute">작성한 공고의 역량 조건으로 전체 가상 인재풀을 다시 계산했습니다.</p>
        </div>
        <span className="rounded-full bg-warning-soft px-3 py-1 text-[10px] text-warning">지원자 아님 · 연락 기능 없음</span>
      </div>

      <div className="mt-5 rounded-xl border border-hairline bg-elevated p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-faint" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="추천 인재 검색" placeholder="이름·직무·역량 검색" className="w-full rounded-md border border-hairline bg-canvas py-2 pl-9 pr-3 text-[12px] text-ink outline-none transition-colors placeholder:text-faint focus:border-link" />
          </label>
          <select value={minimumFit} onChange={(event) => setMinimumFit(Number(event.target.value))} aria-label="추천 최소 적합도" className={FILTER_CLASS}>
            <option value={0}>전체 적합도</option><option value={40}>40점 이상</option><option value={60}>60점 이상</option><option value={80}>80점 이상</option>
          </select>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-body">
          <input type="checkbox" checked={includeDifferentRole} onChange={(event) => setIncludeDifferentRole(event.target.checked)} className="size-3.5 accent-[var(--link)]" />직무명이 다른 역량 전환 후보 포함
        </label>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div id="talent-list" className="space-y-3 employer-list">
          <div className="flex items-center justify-between text-[11px] text-faint"><span>추천 {matches.length}명</span><span>적합도 높은 순 · 최대 18명</span></div>
          {matches.map((match) => (
            <button key={match.candidate.id} type="button" onClick={() => selectCandidate(match.candidate.id)} aria-pressed={selected?.candidate.id === match.candidate.id} className={`employer-candidate w-full rounded-xl border p-4 text-left transition-colors focus-visible:border-link focus-visible:outline-none ${selected?.candidate.id === match.candidate.id ? 'border-link bg-link-soft' : 'border-hairline bg-elevated hover:border-link/50'}`}>
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-hairline-soft text-[12px] font-semibold text-ink">{match.candidate.alias.replace('지원자 ', '')}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><strong className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{match.candidate.alias}</strong>{match.isDifferentRole && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning">직무 전환</span>}</div>
                  <p className="mt-1 text-[12px] text-body">{match.candidate.currentJobTitle} · {isNewcomer(match.candidate.careerMonths) ? '신입' : `${Math.floor(match.candidate.careerMonths / 12)}년차`}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{skillNames(match.matchedSkillIds).slice(0, 4).map((name) => <span key={name} className="rounded-md border border-link/20 px-2 py-0.5 text-[10px] text-link">{name}</span>)}</div>
                </div>
                <div className="text-right"><strong className="text-xl tabular-nums text-ink">{match.fitScore}</strong><p className="text-[10px] text-faint">적합도</p></div>
              </div>
            </button>
          ))}
          {!matches.length && <div className="rounded-xl border border-dashed border-hairline p-10 text-center text-sm text-mute">조건에 맞는 추천 인재가 없습니다.<button type="button" onClick={() => {setQuery('');setMinimumFit(0);setIncludeDifferentRole(true);}} className="mt-4 block mx-auto text-link text-xs">필터 초기화</button></div>}
        </div>

        {selected ? (
          <aside ref={detailRef} tabIndex={-1} className="employer-detail employer-detail-anchor animate-rise rounded-xl border border-hairline bg-elevated p-5 lg:sticky lg:top-16">
            <a href="#talent-list" className="employer-back-list">← 추천 인재 목록으로</a><p className="inline-flex items-center gap-1.5 text-[10px] text-faint"><UserRoundSearch className="size-3.5" />추천 인재 상세 · 미지원</p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div><h3 className="text-xl font-semibold tracking-[-0.025em] text-ink">{selected.candidate.alias}</h3><p className="mt-1 text-[12px] text-mute">{selected.candidate.currentJobTitle} · {selected.candidate.location}</p></div>
              <div className="text-right"><strong className="text-3xl tabular-nums text-ink">{selected.fitScore}</strong><p className="text-[10px] text-faint">역량 적합도</p></div>
            </div>
            <p className="mt-5 text-[13px] leading-[1.7] text-body">{selected.candidate.summary}</p>
            <dl className="mt-5 grid grid-cols-[76px_1fr] gap-y-2 border-y border-hairline py-4 text-[11px]">
              <dt className="text-faint">희망 근무</dt><dd>{selected.candidate.desiredWorkModes.map((mode) => WORK_MODE_LABEL[mode]).join(' · ')}</dd>
              <dt className="text-faint">필수 충족</dt><dd>{Math.round(selected.mustCoverage * 100)}%</dd>
              <dt className="text-faint">우대 충족</dt><dd>{Math.round(selected.niceCoverage * 100)}%</dd>
            </dl>
            <h4 className="mt-5 text-[12px] font-medium text-ink">확인된 역량 근거</h4>
            <ul className="mt-3 space-y-2">{selected.matchedSkillIds.slice(0, 5).map((skillId) => <li key={skillId} className="rounded-lg bg-hairline-soft px-3 py-2"><p className="text-[11px] font-medium text-ink">{getSkill(skillId)?.name ?? skillId}</p><p className="mt-1 text-[10px] leading-relaxed text-mute">{selected.candidate.skillEvidence.find((row) => row.skillId === skillId)?.evidence ?? '보유 역량 목록에서 확인된 항목입니다.'}</p></li>)}</ul>
            {selected.gapSkillIds.length > 0 && <div className="mt-5"><h4 className="text-[12px] font-medium text-ink">확인이 필요한 역량</h4><div className="mt-2 flex flex-wrap gap-1.5">{skillNames(selected.gapSkillIds).map((name) => <span key={name} className="rounded-md bg-warning-soft px-2 py-1 text-[10px] text-warning">{name}</span>)}</div></div>}
            <p className="mt-5 border-t border-hairline pt-4 text-[10px] leading-relaxed text-faint">이 결과는 가상 인재풀을 대상으로 한 목업 추천입니다. 지원 사실이나 연락 가능 상태를 뜻하지 않습니다.</p>
          </aside>
        ) : <aside className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-mute">추천 인재를 선택해 주세요.</aside>}
      </div>
    </section>
  );
}
