'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AnalysisResult } from '@/types';
import ResumeInput from '@/components/ResumeInput';
import ResultView from '@/components/ResultView';
import './personal.css';

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);

  return (
    <main className={result ? 'mx-auto max-w-3xl px-5 py-12 sm:py-16' : 'personal-page'}>
      <header className={!result ? 'personal-intro' : undefined}>
        <Link href="/" className="text-[12px] text-faint transition-colors hover:text-ink">← Career Navi</Link>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          {result ? '당신의 다음 커리어를,' : '쌓아온 경험에서,'}
          <br />
          {result ? '데이터로 안내합니다.' : '다음 가능성을 찾아보세요.'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          이력서나 직접 적은 경험을 바탕으로 강점과 연결되는 직무를 살펴봅니다.
          <br className="hidden sm:block" />
          직무명보다 어떤 일을 했는지가 중요합니다.
        </p>
      </header>

      {!result && <ol className="personal-progress" aria-label="커리어 탐색 순서">
        <li aria-current="step"><span>01</span> 경험 입력</li>
        <li><span>02</span> 역량 분석</li>
        <li><span>03</span> 커리어 경로 확인</li>
      </ol>}

      <div className={result ? 'mt-12' : 'personal-content'}>
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
