'use client';

import { useState } from 'react';
import type { AnalysisResult } from '@/types';

const CONTEST_URL = 'https://event.wanted.co.kr/ai-championship/2026';

/**
 * 결과를 이미지 1장으로 공유한다.
 * ⚠️ 결과를 서버에 저장하지 않으므로 카드에 필요한 값만 쿼리로 넘긴다.
 *    Skill.evidence(이력서 원문)는 절대 포함하지 않는다.
 */
export default function ShareButton({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);

  // hidden route 가 없으면 최고 적합도 경로를 쓰되 "이 길도 있어요" 배지는 붙이지 않는다.
  // 본인 현재 직무에 그 배지가 붙으면 카드가 사실과 다른 말을 하게 된다.
  const hiddenRoute = result.routes.find((r) => r.isHiddenRoute);
  const hidden = hiddenRoute ?? result.routes[0];
  if (!hidden) return null;

  const params = new URLSearchParams({
    jt: result.currentPosition.jobTitle,
    cm: String(result.currentPosition.careerMonths),
    d: hidden.destination,
    f: String(hidden.fitScore),
    b: hidden.bridgeSkills.slice(0, 3).join('|'),
    ...(hiddenRoute ? { hidden: '1' } : {}),
  });
  const imageUrl = `/api/og/personal?${params}`;

  const shareText =
    (hiddenRoute
      ? `커리어 내비로 분석해 봤더니 몰랐던 "${hidden.destination}" 경로가 나왔어요 (적합도 ${hidden.fitScore})\n`
      : `커리어 내비로 분석해 봤더니 "${hidden.destination}" 적합도가 ${hidden.fitScore}점 나왔어요\n`) +
    `직무명이 아니라 역량으로 커리어를 연결해 주는 서비스예요.\n${CONTEST_URL}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 권한이 없는 환경 — 조용히 무시 */
    }
  }

  return (
    <section className="mt-12 rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <h3 className="text-sm font-medium">결과 공유하기</h3>
      <p className="mt-1 text-xs leading-relaxed opacity-55">
        이미지에는 직무명과 역량만 들어갑니다. 입력한 이력서 내용은 포함되지 않습니다.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="공유 카드 미리보기" className="w-full" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={imageUrl}
          download="career-navi.png"
          className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"
        >
          이미지 저장
        </a>
        <button
          onClick={copy}
          className="rounded-xl border border-black/12 px-4 py-2.5 text-sm transition hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.05]"
        >
          {copied ? '복사됨' : '공유 문구 복사'}
        </button>
      </div>
    </section>
  );
}
