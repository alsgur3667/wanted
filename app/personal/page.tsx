'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AnalysisResult } from '@/types';
import ResumeInput from '@/components/ResumeInput';
import ResultView from '@/components/ResultView';

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <Link href="/" className="text-xs opacity-45 transition hover:opacity-90">← 커리어 내비</Link>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          당신의 다음 커리어를,
          <br />
          데이터로 안내합니다.
        </h1>
        <p className="mt-3 text-sm leading-relaxed opacity-60">
          가진 역량을 분석해 갈 수 있는 경로 3개를 보여줍니다.
          <br className="hidden sm:block" />
          그중 하나는 스스로는 떠올리기 어려운 길입니다.
        </p>
      </header>

      <div className="mt-12">
        {result ? (
          <ResultView result={result} onReset={() => setResult(null)} />
        ) : (
          <ResumeInput onResult={setResult} />
        )}
      </div>

      <footer className="mt-16 border-t border-black/5 pt-6 text-xs opacity-45 dark:border-white/5">
        입력한 이력서는 분석 후 저장하지 않습니다. · 원티드 AI Championship 2026
      </footer>
    </main>
  );
}
