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
        <Link href="/" className="text-[12px] text-faint transition-colors hover:text-ink">← Career Navi</Link>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          당신의 다음 커리어를,
          <br />
          데이터로 안내합니다.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          가진 역량을 분석해 갈 수 있는 경로 3개를 보여줍니다.
          <br className="hidden sm:block" />
          근거가 충분하면 스스로는 떠올리기 어려운 길도 함께 보여줍니다.
        </p>
      </header>

      <div className="mt-12">
        {result ? (
          <ResultView result={result} onReset={() => setResult(null)} />
        ) : (
          <ResumeInput onResult={setResult} />
        )}
      </div>

      {/* 자세한 안내는 입력 칸 옆(PrivacyNotice)에 있다. 결정을 내리는 자리에
          있어야 읽히지, 화면 맨 아래 각주로 두면 아무도 안 본다.
          여기서는 되풀이하지 않고 출처만 남긴다. */}
      <footer className="mt-16 border-t border-hairline pt-6 text-xs text-faint">
        원티드 AI Championship 2026 · 회사·공고·지원자는 모두 가상 데이터입니다
      </footer>
    </main>
  );
}
