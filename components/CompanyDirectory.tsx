'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CompanyMark from '@/components/CompanyMark';
import {
  COMPANIES,
  postingsForCompany,
  searchCompanies,
  STAGE_LABEL,
  WORK_MODE_LABEL,
} from '@/lib/company-index';

export default function CompanyDirectory() {
 const [query,setQuery]=useState('');
 const [mode,setMode]=useState('all');
 const companies=useMemo(()=>searchCompanies(query).filter(c=>mode==='all'||c.workModes.some(m=>m===mode)),[query,mode]);
 function reset(){setQuery('');setMode('all');}
 return <>
 <div className="company-search"><label htmlFor="company-search">어떤 팀을 찾고 계신가요?</label><div className="company-search-row"><input id="company-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="회사명, 산업 또는 관심 분야 검색"/><select aria-label="근무 방식 필터" value={mode} onChange={e=>setMode(e.target.value)}><option value="all">모든 근무 방식</option>{Object.entries(WORK_MODE_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></div>
 <div className="company-count"><p role="status">전체 {COMPANIES.length}개 중 <strong>{companies.length}개 회사</strong></p>{(query||mode!=='all')&&<button className="company-reset" onClick={reset}>검색 조건 초기화</button>}</div>
 <div className="company-grid">{companies.map(c=><Link key={c.id} href={'/companies/'+c.id} className="company-card"><div className="company-card-head"><CompanyMark company={c}/><div><h2>{c.name}</h2><p>{c.industry} · {c.employeeCountRange}</p></div></div><p className="company-card-description">{c.tagline}</p><div className="company-tags"><span>{STAGE_LABEL[c.stage]}</span>{c.workModes.map(m=><span key={m}>{WORK_MODE_LABEL[m]}</span>)}</div><div className="company-card-footer"><span>채용 중 {postingsForCompany(c.id).length}개</span><span>팀 알아보기 →</span></div></Link>)}</div>
 {!companies.length&&<div className="company-empty"><p>조건에 맞는 회사가 없습니다.</p><p className="mt-2 text-xs">검색어를 줄이거나 근무 방식 조건을 바꿔보세요.</p><button className="company-reset mt-3" onClick={reset}>전체 회사 보기</button></div>}
 </>;
}