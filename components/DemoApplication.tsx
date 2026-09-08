'use client';

import { useState } from 'react';


export default function DemoApplication({ companyName, postingTitle }: { companyName: string; postingTitle: string }) {
  const [complete, setComplete] = useState(false);

  if (complete) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-6">
        <h2 className="font-semibold text-emerald-700 dark:text-emerald-300">데모 지원 흐름을 확인했습니다</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-70">
          실제 지원서는 전송되지 않았고 입력 정보도 저장하지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setComplete(true)}
      className="w-full rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
    >
      {companyName} · {postingTitle} 데모 지원 확인
    </button>
  );
}
