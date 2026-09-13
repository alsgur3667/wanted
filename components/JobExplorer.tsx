'use client';
import { useMemo, useRef, useState } from 'react';
import type { Skill } from '@/types';
import { JOBS } from '@/lib/skill-index';
import { jobDetailOf } from '@/lib/job-detail';
import JobRequirements from './JobRequirements';

export default function JobExplorer({ mySkills, shownJobTitles }: {mySkills: Skill[]; shownJobTitles: string[]}) {
 const [picked,setPicked] = useState('');
 const [query,setQuery] = useState('');
 const [family,setFamily] = useState('');
 const detailRef = useRef<HTMLDivElement>(null);
 const jobs = useMemo(() => JOBS.filter(job => !shownJobTitles.includes(job.title)),[shownJobTitles]);
 const families = [...new Set(jobs.map(job => job.family))];
 const visible = jobs.filter(job => (!family || job.family === family) && job.title.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')));
 const detail = picked ? jobDetailOf(picked,mySkills) : null;
 return <section className="job-explorer">
  <h2 className="text-2xl font-semibold">다른 직무 탐색</h2><p className="mt-2 text-body">관심 있는 직무를 골라 내 역량과 비교해보세요. 추천 순위와는 별개의 탐색입니다.</p>
  <div className="explorer-controls"><input aria-label="직무 검색" placeholder="궁금한 직무를 검색하세요" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="직군 필터" value={family} onChange={event => setFamily(event.target.value)}><option value="">전체 직군</option>{families.map(value => <option key={value}>{value}</option>)}</select></div>
  <p className="mb-3 text-sm text-mute" role="status">{visible.length}개 직무</p>
  <div className="explorer-grid">{visible.map(job => {const match = jobDetailOf(job.title,mySkills);return <button key={job.id} type="button" aria-pressed={picked === job.title} onClick={() => {setPicked(job.title);requestAnimationFrame(() => {detailRef.current?.scrollIntoView({block:'start'});detailRef.current?.focus({preventScroll:true});});}}><span>{job.family}</span><strong>{job.title}</strong><span>{match ? `필수 역량 ${match.mustHeld} / ${match.mustTotal}개 보유` : '요구 역량 확인'}</span><span className="mt-3">역량 비교 보기 →</span></button>;})}</div>
  {!visible.length && <div className="result-empty"><p>조건에 맞는 직무가 없습니다.</p><button className="mt-3 text-link" onClick={() => {setQuery('');setFamily('');}}>검색 조건 초기화</button></div>}
  {detail && <div ref={detailRef} tabIndex={-1} className="mt-6 rounded-xl border border-hairline bg-elevated p-5 scroll-mt-24"><div className="mb-5 flex flex-wrap justify-between gap-3"><div><h3 className="text-2xl font-semibold">{detail.title}</h3><p className="mt-2 text-body">{detail.oneLiner}</p></div><button className="text-link" onClick={() => setPicked('')}>상세 닫기</button></div><JobRequirements detail={detail} /></div>}
 </section>;
}
