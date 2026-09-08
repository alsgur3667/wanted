'use client';

import { useState } from 'react';
import type { AnalysisResult } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';

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

  // 적합도(0~100) 대신 셀 수 있는 사실을 싣는다 — 이슈 #28 참고.
  const detail = jobDetailOf(hidden.destination, result.skills, hidden.requirements);
  const mustHeld = detail?.mustHeld ?? hidden.bridgeSkills.length;
  const mustTotal = detail?.mustTotal ?? hidden.bridgeSkills.length + hidden.gapSkills.length;

  const params = new URLSearchParams({
    jt: result.currentPosition.jobTitle,
    cm: String(result.currentPosition.careerMonths),
    d: hidden.destination,
    mh: String(mustHeld),
    mt: String(mustTotal),
    b: hidden.bridgeSkills.slice(0, 3).join('|'),
    ...(hiddenRoute ? { hidden: '1' } : {}),
  });
  const imageUrl = `/api/og/personal?${params}`;

  const shareText =
    (hiddenRoute
      ? `커리어 내비로 분석해 봤더니 몰랐던 "${hidden.destination}" 경로가 나왔어요 (필수 역량 ${mustTotal}개 중 ${mustHeld}개 보유)\n`
      : `커리어 내비로 분석해 봤더니 "${hidden.destination}"의 필수 역량 ${mustTotal}개 중 ${mustHeld}개를 이미 갖고 있대요\n`) +
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
    <section className="mt-12 rounded-xl border border-hairline bg-elevated px-5 py-4">
      <h3 className="text-[13px] font-medium text-ink">결과 공유하기</h3>
      <p className="mt-1 text-[12px] leading-[1.6] text-mute">
        이미지에는 직무명과 역량만 들어갑니다. 입력한 이력서 내용은 포함되지 않습니다.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="공유 카드 미리보기 " className="w-full" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={imageUrl}
          download="career-navi.png"
          className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-canvas transition-opacity hover:opacity-85"
        >
          이미지 저장
        </a>
        <button
          onClick={copy}
          className="rounded-full border border-hairline bg-elevated px-4 py-2.5 text-[14px] text-ink transition-colors hover:border-mute"
        >
          {copied ? '복사됨' : '공유 문구 복사'}
        </button>
      </div>
    </section>
  );
}
