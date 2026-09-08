'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CompanyMark from '@/components/CompanyMark';
import { COMPANIES, postingsForCompany, searchCompanies, STAGE_LABEL, WORK_MODE_LABEL } from '@/lib/company-index';


export default function CompanyDirectory() {
  const [query, setQuery] = useState('');
  const companies = useMemo(() => searchCompanies(query), [query]);

  return (
    <>
      <div className="mt-8">
        <label htmlFor="company-search" className="text-xs font-medium opacity-55">회사·산업·태그 검색</label>
        <input
          id="company-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 핀테크, 데이터, SaaS"
          className="mt-2 w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 text-sm outline-none transition placeholder:opacity-40 focus:border-amber-400 dark:border-white/15"
        />
        <p className="mt-2 text-xs opacity-45">전체 {COMPANIES.length}개 중 {companies.length}개</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {companies.map((company) => {
          const postings = postingsForCompany(company.id);
          return (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="group rounded-2xl border border-black/10 p-5 transition hover:-translate-y-0.5 hover:border-amber-400/70 dark:border-white/12"
            >
              <div className="flex items-start gap-3">
                <CompanyMark company={company} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{company.name}</h2>
                    <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">가상</span>
                  </div>
                  <p className="mt-1 text-xs opacity-55">{company.industry} · {company.employeeCountRange}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed opacity-75">{company.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] opacity-60">
                <span>{STAGE_LABEL[company.stage]}</span>
                <span>·</span>
                <span>{company.workModes.map((mode) => WORK_MODE_LABEL[mode]).join(' · ')}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3 text-xs dark:border-white/[0.07]">
                <span className="opacity-55">채용 중 {postings.length}개</span>
                <span className="font-medium transition group-hover:translate-x-0.5">회사 보기 →</span>
              </div>
            </Link>
          );
        })}
      </div>

      {companies.length === 0 && (
        <p className="mt-6 rounded-xl border border-black/10 p-8 text-center text-sm opacity-50 dark:border-white/10">
          검색 결과가 없습니다.
        </p>
      )}
    </>
  );
}
