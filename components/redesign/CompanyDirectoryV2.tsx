'use client';

// ============================================================================
//  CompanyDirectoryV2.tsx — Career Navi · 2026-09-17
//  리디자인 1차 회사 목록. 검색 + 드롭다운 4개(산업군 · 기업 규모 · 근무 형태 ·
//  채용 중)가 실제로 동작한다. 옵션은 데이터(demo-companies.json)에서 뽑는다.
//  카드: 원형 이니셜 마크(3색 순환) · 채용 중 배지 · 메타 행(직원·본사·근무·단계).
//  기존 CompanyDirectory 는 그대로 둔다.
// ============================================================================

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, Calendar, ChevronDown, Layers, MapPin, Search, TrendingUp, Users, UsersRound } from 'lucide-react';
import { COMPANIES, postingsForCompany, searchCompanies, STAGE_LABEL, WORK_MODE_LABEL } from '@/lib/company-index';
import CompanyMarkV2 from './CompanyMarkV2';


/** 직원 수 범위를 숫자 순으로 정렬하기 위한 키 */
function sizeKey(range: string) {
  return Number(range.replace(/[^0-9]/g, '').slice(0, 5)) || 0;
}

const INDUSTRIES = [...new Set(COMPANIES.map((c) => c.industry))].sort((a, b) => a.localeCompare(b, 'ko'));
const SIZES = [...new Set(COMPANIES.map((c) => c.employeeCountRange))].sort((a, b) => sizeKey(a) - sizeKey(b));

function Select({ id, icon: Icon, label, value, onChange, children }: {
  id: string; icon: typeof Layers; label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <label className="sel" htmlFor={id}>
      <Icon size={16} aria-hidden />
      <span className="sr-only">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
      <ChevronDown size={16} className="chev" aria-hidden />
    </label>
  );
}

export default function CompanyDirectoryV2({ basePath = '/companies' }: { basePath?: string }) {
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('all');
  const [size, setSize] = useState('all');
  const [mode, setMode] = useState('all');
  const [hiring, setHiring] = useState('all');

  const companies = useMemo(() => searchCompanies(query).filter((c) => {
    if (industry !== 'all' && c.industry !== industry) return false;
    if (size !== 'all' && c.employeeCountRange !== size) return false;
    if (mode !== 'all' && !c.workModes.some((m) => m === mode)) return false;
    const n = postingsForCompany(c.id).length;
    if (hiring === 'open' && n === 0) return false;
    if (hiring === 'many' && n < 3) return false;
    return true;
  }), [query, industry, size, mode, hiring]);

  const filtered = query || industry !== 'all' || size !== 'all' || mode !== 'all' || hiring !== 'all';
  function reset() { setQuery(''); setIndustry('all'); setSize('all'); setMode('all'); setHiring('all'); }

  return (
    <>
      <div className="wrap rv rv-2">
        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
          <div className="search">
            <Search size={18} aria-hidden />
            <input id="company-search-v2" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="회사명, 키워드, 기술 스택으로 검색해보세요." aria-label="회사 검색" />
            <button type="submit" className="btn btn-navy btn-sm">검색</button>
          </div>
          <Select id="f-industry" icon={Layers} label="산업군" value={industry} onChange={setIndustry}>
            <option value="all">산업군 전체</option>
            {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Select id="f-size" icon={Users} label="기업 규모" value={size} onChange={setSize}>
            <option value="all">기업 규모 전체</option>
            {SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Select id="f-mode" icon={Briefcase} label="근무 형태" value={mode} onChange={setMode}>
            <option value="all">근무 형태 전체</option>
            {Object.entries(WORK_MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Select id="f-hiring" icon={Calendar} label="채용 중" value={hiring} onChange={setHiring}>
            <option value="all">채용 중 전체</option>
            <option value="open">채용 중인 회사</option>
            <option value="many">공고 3개 이상</option>
          </Select>
        </form>
        <div className="count">
          <p role="status">전체 {COMPANIES.length}개 중 <strong>{companies.length}개 회사</strong></p>
          {filtered && <button type="button" className="textlink" onClick={reset}>검색 조건 초기화</button>}
        </div>
      </div>

      <section className="list-sec">
        <div className="wrap">
          <div className="list-head rv rv-3">
            <div><span className="overline">Recommended companies</span><h2 className="hd">지금, 이런 기업들이 기다리고 있어요.</h2></div>
          </div>
          <div className="grid">
            {companies.map((c, i) => {
              const n = postingsForCompany(c.id).length;
              return (
                <Link key={c.id} href={`${basePath}/${c.id}`} className={`ccard rv rv-${(i % 3) + 1}`}>
                  <div className="head">
                    <CompanyMarkV2 company={c} />
                    <div><h3>{c.name}</h3><p>{c.industry}</p></div>
                    <span className="badge">{n > 0 ? `채용 중 ${n}개` : '채용 예정'}</span>
                  </div>
                  <ul className="meta">
                    <li><UsersRound size={13} aria-hidden />직원 {c.employeeCountRange}</li>
                    <li><MapPin size={13} aria-hidden />{c.headquarters}</li>
                    <li><Briefcase size={13} aria-hidden />{c.workModes.map((m) => WORK_MODE_LABEL[m]).join(' · ')}</li>
                    <li><TrendingUp size={13} aria-hidden />{STAGE_LABEL[c.stage]}</li>
                  </ul>
                  <p className="desc">{c.tagline}</p>
                  <ArrowRight size={18} className="go" aria-hidden />
                </Link>
              );
            })}
          </div>
          {!companies.length && (
            <div className="empty">
              <p>조건에 맞는 회사가 없습니다.</p>
              <p>검색어를 줄이거나 필터를 바꿔보세요.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>전체 회사 보기</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
