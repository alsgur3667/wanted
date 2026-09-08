'use client';

import { useState } from 'react';

// 실제 지원이 아니다. 버튼을 눌러도 네트워크 요청도, 저장도 없다.
// 그래서 완료 화면의 색을 요란하게 쓰지 않는다 — 청록 하나로 "확인됨"만 말한다.
export default function DemoApplication({
  companyName,
  postingTitle,
}: {
  companyName: string;
  postingTitle: string;
}) {
  const [complete, setComplete] = useState(false);

  if (complete) {
    return (
      <div className="rounded-xl border border-link/30 bg-link-soft p-6">
        <h2 className="text-[15px] font-semibold text-link-deep dark:text-link">
          데모 지원 흐름을 확인했습니다
        </h2>
        <p className="mt-2 text-[13px] leading-[1.6] text-body">
          실제 지원서는 전송되지 않았고 입력 정보도 저장하지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setComplete(true)}
      className="w-full rounded-md bg-ink px-5 py-3 text-[13px] font-semibold text-elevated transition-opacity hover:opacity-85"
    >
      {companyName} · {postingTitle} 데모 지원 확인
    </button>
  );
}
