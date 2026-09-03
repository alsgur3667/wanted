'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { JOB_REQUIREMENTS } from '@/data/job-requirements';
import { CANDIDATES } from '@/data/candidates';
import { buildEmployerResult } from '@/lib/matching';
import CandidateCard from '@/components/CandidateCard';

export default function EmployerPage() {
  const [jobId, setJobId] = useState(JOB_REQUIREMENTS[0].id);
  const [includeCrossRole, setIncludeCrossRole] = useState(true);

  const req = JOB_REQUIREMENTS.find((j) => j.id === jobId)!;

  const result = useMemo(
    () => buildEmployerResult(req, CANDIDATES, { includeCrossRole }),
    [req, includeCrossRole]
  );
  const sameRoleCount = useMemo(
    () => buildEmployerResult(req, CANDIDATES, { includeCrossRole: false }).matches.length,
    [req]
  );
  const hiddenCount = result.matches.filter((m) => m.isCrossRole).length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <Link href="/" className="text-xs opacity-45 transition hover:opacity-90">← 커리어 내비</Link>
        <h1 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">
          직무명으로는 보이지 않는
          <br />
          지원자를 찾습니다.
        </h1>
        <p className="mt-3 text-sm leading-relaxed opacity-60">
          직무명이 아니라 역량으로 매칭합니다. 같은 일을 해 왔지만 직함이 다른 사람이 드러납니다.
        </p>
      </header>

      <section className="mt-10">
        <label className="text-xs font-medium opacity-55">채용 직무</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {JOB_REQUIREMENTS.map((j) => (
            <button
              key={j.id}
              onClick={() => setJobId(j.id)}
              className={`rounded-xl border px-4 py-2.5 text-sm transition ${
                j.id === jobId
                  ? 'border-amber-400 bg-amber-400/10 font-medium'
                  : 'border-black/10 opacity-70 hover:opacity-100 dark:border-white/12'
              }`}
            >
              {j.title}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-black/10 p-4 text-xs dark:border-white/10">
          <p>
            <span className="opacity-50">필수</span>{' '}
            <span className="font-medium">{req.mustSkills.join(' · ')}</span>
          </p>
          <p className="mt-1.5">
            <span className="opacity-50">우대</span>{' '}
            <span className="opacity-75">{req.niceSkills.join(' · ')}</span>
          </p>
        </div>
      </section>

      <section className="mt-8">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
          <input
            type="checkbox"
            checked={includeCrossRole}
            onChange={(e) => setIncludeCrossRole(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-400"
          />
          <span className="text-sm">
            직무명이 다른 후보도 포함
            <span className="mt-1 block text-xs opacity-55">
              끄면 {sameRoleCount}명, 켜면 {sameRoleCount + hiddenCount}명
              {hiddenCount > 0 && (
                <> · 직무명 검색으로는 <strong className="font-medium opacity-100">{hiddenCount}명을 놓칩니다</strong></>
              )}
            </span>
          </span>
        </label>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">적합도 순 {result.matches.length}명</h2>
          <span className="text-xs opacity-45">필수 3 : 우대 1 가중</span>
        </div>
        <div className="mt-5 space-y-4">
          {result.matches.map((m, i) => (
            <CandidateCard key={m.candidate.id} match={m} rank={i + 1} />
          ))}
          {result.matches.length === 0 && (
            <p className="rounded-xl border border-black/10 p-8 text-center text-sm opacity-50 dark:border-white/10">
              조건에 맞는 지원자가 없습니다.
            </p>
          )}
        </div>
      </section>

      <footer className="mt-16 border-t border-black/5 pt-6 text-xs leading-relaxed opacity-45 dark:border-white/5">
        표시된 지원자는 실제 인물이 아닌 <strong className="font-medium">샘플 데이터</strong>입니다.
        실제 서비스에서는 지원자가 공개에 동의한 항목만 노출됩니다.
        <br />
        원티드 AI Championship 2026
      </footer>
    </main>
  );
}
