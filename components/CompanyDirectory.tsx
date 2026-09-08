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

// 색은 ink → body → mute → faint 네 단계만 쓴다. 투명도로 위계를 만들지 않는다.
// 청록(--link)은 포커스 한 곳에만 — 지금 입력 중인 칸이 어디인지 말하는 용도다.

export default function CompanyDirectory() {
  const [query, setQuery] = useState('');
  const companies = useMemo(() => searchCompanies(query), [query]);

  return (
    <>
      <div className="mt-8">
        <label htmlFor="company-search" className="text-[11px] font-medium uppercase tracking-wider text-faint">
          회사·산업·태그 검색
        </label>
        <input
          id="company-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 핀테크, 데이터, SaaS"
          className="mt-2 w-full rounded-md border border-hairline bg-elevated px-4 py-3 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-link"
        />
        <p className="mt-2 text-[12px] text-mute">
          전체 {COMPANIES.length}개 중 {companies.length}개
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {companies.map((company) => {
          const postings = postingsForCompany(company.id);
          return (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="group rounded-xl border border-hairline bg-elevated p-5 transition-colors hover:border-mute"
            >
              <div className="flex items-start gap-3">
                <CompanyMark company={company} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{company.name}</h2>
                    <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      가상
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-mute">
                    {company.industry} · {company.employeeCountRange}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-[1.6] text-body">{company.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-faint">
                <span>{STAGE_LABEL[company.stage]}</span>
                <span>·</span>
                <span>{company.workModes.map((mode) => WORK_MODE_LABEL[mode]).join(' · ')}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-[12px]">
                <span className="text-mute">채용 중 {postings.length}개</span>
                <span className="font-medium text-ink transition-transform group-hover:translate-x-0.5">
                  회사 보기 →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {companies.length === 0 && (
        <p className="mt-6 rounded-xl border border-hairline p-8 text-center text-[13px] text-mute">
          검색 결과가 없습니다.
        </p>
      )}
    </>
  );
}
