'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Compass, FileText, Route, Sparkles } from 'lucide-react';
import type { AnalysisResult } from '@/types';
import ResumeInput from '@/components/ResumeInput';
import ResultView from '@/components/ResultView';

export default function PersonalPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [searching, setSearching] = useState(false);
  const currentStep = result ? 2 : searching ? 1 : 0;
  const heading = useRef<HTMLHeadingElement>(null);
  function showResult(next: AnalysisResult | null) {
    setResult(next);
    setSearching(false);
    requestAnimationFrame(() => heading.current?.focus());
  }

  return (
    <main id="main-content" className="site-container py-9 sm:py-12">
      <header>
        <p className="eyebrow"><Compass className="size-4" />개인 · 커리어 탐색</p>
        <h1 ref={heading} tabIndex={-1} className="mt-3 scroll-mt-36 text-[30px] font-semibold leading-snug text-ink outline-none sm:text-[38px]">{result ? '경험을 이어갈 다음 경로입니다.' : '해 온 일에서, 다음 길을 찾아보세요.'}</h1>
        <p className="mt-3 text-sm leading-7 text-body">{result ? '연결되는 역량과 보완할 부분을 비교하며 나에게 맞는 방향을 살펴보세요.' : '이력서가 완성되지 않아도 괜찮습니다. 프로젝트와 인턴 경험부터 시작할 수 있습니다.'}</p>
      </header>
      <ol aria-label="커리어 탐색 진행 단계" className="mt-8 flex gap-2 border-b border-hairline pb-5 sm:gap-8">
        {['경험 입력', '역량 분석', '경로 확인'].map((label, i) => <li key={label} aria-current={i === currentStep ? 'step' : undefined} className={`flex items-center gap-2 text-xs sm:text-sm ${i === currentStep ? 'font-semibold text-link' : 'text-mute'}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs ${i === currentStep ? 'bg-link text-elevated' : 'bg-hairline-soft'}`}>{i + 1}</span>{label}</li>)}
      </ol>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_290px] xl:gap-12">
        <div className="min-w-0">{result ? <ResultView result={result} onReset={() => showResult(null)} /> : <ResumeInput onResult={showResult} onSearchingChange={setSearching} />}</div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="workspace-panel">
            <p className="eyebrow">{result ? '결과를 활용하는 방법' : '탐색 후 확인할 수 있어요'}</p>
            <div className="mt-6 space-y-6">{[
              { icon: Sparkles, title: '내가 가진 역량', text: '해 온 일에서 어떤 역량이 드러나는지 정리합니다.' },
              { icon: Route, title: '연결 가능한 경로', text: '경험을 활용할 수 있는 직무와 추천 근거를 확인합니다.' },
              { icon: FileText, title: '다음에 준비할 것', text: '목표 직무에서 요구하는 역량과 보완할 부분을 비교합니다.' },
            ].map(({icon: Icon, title, text}) => <div key={title} className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-link" /><div><h2 className="text-sm font-semibold text-ink">{title}</h2><p className="mt-1.5 text-xs leading-6 text-mute">{text}</p></div></div>)}</div>
          </section>
          <Link href="/companies" className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-5 py-4 text-sm text-ink hover:bg-elevated">회사와 공고도 살펴보세요<ArrowUpRight className="size-4 shrink-0" /></Link>
          <p className="px-1 text-xs leading-6 text-mute">추천은 탐색을 돕는 참고 정보입니다. 회사와 공고는 서비스 체험을 위한 가상 데이터입니다.</p>
        </aside>
      </div>
    </main>
  );
}
