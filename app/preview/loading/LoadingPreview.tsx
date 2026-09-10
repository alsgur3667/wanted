'use client';

import { useState } from 'react';
import Link from 'next/link';
import RouteSearchLoader from '@/components/RouteSearchLoader';

type PreviewState = 'waiting' | 'slow' | 'ready';
export default function LoadingPreview() {
  const [state, setState] = useState<PreviewState>('waiting');
  const [finished, setFinished] = useState(false);
  const [generation, setGeneration] = useState(0);
  return (
    <main className="mx-auto max-w-5xl px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div><p className="text-sm font-semibold">분석 로딩 미리보기</p><p className="mt-1 text-xs text-mute">실제 분석 요청 없이 화면 상태를 확인합니다.</p></div>
        <div role="group" aria-label="미리보기 상태" className="flex flex-wrap gap-2">
          {([['waiting', '분석 중'], ['slow', '오래 걸릴 때'], ['ready', '결과 준비 완료']] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={state === value} onClick={() => { setState(value); setFinished(false); if (value === 'waiting') setGeneration(n => n + 1); }} className={`min-h-10 rounded-lg border px-3 text-xs ${state === value ? 'border-link bg-link-soft text-link' : 'border-hairline text-mute'}`}>{label}</button>
          ))}
        </div>
      </div>
      {finished ? <section className="py-24 text-center" role="status">
        <h1 className="text-2xl font-semibold">결과 화면으로 이어지는 시점입니다.</h1>
        <p className="mt-3 text-sm text-mute">실제 분석에서는 이 자리에 개인 분석 결과가 표시됩니다.</p>
        <button onClick={() => { setState('waiting'); setFinished(false); setGeneration(n => n + 1); }} className="mt-6 rounded-lg bg-link px-5 py-3 text-sm text-canvas">미리보기 다시 시작</button>
      </section> : <RouteSearchLoader key={generation} ready={state === 'ready'} forceSlow={state === 'slow'} focusOnMount={false} onDone={() => setFinished(true)} />}
      <div className="mt-4 text-center"><Link href="/personal" className="text-xs text-link underline underline-offset-4">개인 첫 화면으로</Link></div>
    </main>
  );
}
