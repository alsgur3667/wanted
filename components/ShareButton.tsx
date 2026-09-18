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
  /** 'all' = 경로 셋을 묶은 요약, 그 외는 cards 의 인덱스 */
  const [picked, setPicked] = useState('all');

  // hidden route 가 없으면 최고 적합도 경로를 쓰되 "이 길도 있어요" 배지는 붙이지 않는다.
  // 본인 현재 직무에 그 배지가 붙으면 카드가 사실과 다른 말을 하게 된다.
  const hiddenRoute = result.routes.find((r) => r.isHiddenRoute);
  const hidden = hiddenRoute ?? result.routes[0];
  if (!hidden) return null;

  // 적합도(0~100) 대신 셀 수 있는 사실을 싣는다 — 이슈 #28 참고.
  const detail = jobDetailOf(hidden.destination, result.skills, hidden.requirements);
  const mustHeld = detail?.mustHeld ?? hidden.bridgeSkills.length;
  const mustTotal = detail?.mustTotal ?? hidden.bridgeSkills.length + hidden.gapSkills.length;

  // 경로마다 카드를 만들 수 있게 한다.
  //
  // 예전에는 1위(또는 히든) 하나만 카드가 됐다. 그런데 우리 화면은 애초에
  // 셋을 나란히 놓고 고르게 하는 것이고, 사람마다 남기고 싶은 경로가 다르다.
  // 1위가 지금 하던 일과 같은 직무면 저장할 이유가 없는 경우도 있다.
  //
  // 그래서 목록에서 고른다 — 셋을 묶은 요약 한 장, 그리고 경로별 한 장씩.
  const cards = result.routes.slice(0, 3).map((route) => {
    const d = jobDetailOf(route.destination, result.skills, route.requirements);
    return {
      route,
      held: d?.mustHeld ?? route.bridgeSkills.length,
      total: d?.mustTotal ?? route.bridgeSkills.length + route.gapSkills.length,
    };
  });

  // 카드 한 장에 담는 형식 — `목적지~보유~전체~히든여부`.
  // 값마다 쿼리 키를 따로 두면 URL 이 길어지고, 결과를 서버에 저장하지 않으므로
  // 카드에 들어갈 값은 전부 여기서 넘겨야 한다.
  const encode = (c: (typeof cards)[number]) =>
    `${c.route.destination}~${c.held}~${c.total}~${c.route.isHiddenRoute ? 1 : 0}`;

  const chosen = picked === 'all' ? null : cards[Number(picked)];

  const params = new URLSearchParams({
    jt: result.currentPosition.jobTitle,
    cm: String(result.currentPosition.careerMonths),
    r: chosen ? encode(chosen) : cards.map(encode).join('|'),
    b: (chosen?.route ?? hidden).bridgeSkills.slice(0, 3).join('|'),
  });
  const imageUrl = `/api/og/personal?${params}`;

  const shareText = chosen
    ? (chosen.route.isHiddenRoute
        ? `Career Navi로 분석해 봤더니 몰랐던 "${chosen.route.destination}" 경로가 나왔어요 (필수 역량 ${chosen.total}개 중 ${chosen.held}개 보유)\n`
        : `Career Navi로 분석해 봤더니 "${chosen.route.destination}"의 필수 역량 ${chosen.total}개 중 ${chosen.held}개를 이미 갖고 있대요\n`) +
      `직무명이 아니라 역량으로 커리어를 연결해 주는 서비스예요.\n${CONTEST_URL}`
    : `Career Navi로 분석해 봤더니 제 경험과 연결되는 커리어 경로 ${cards.length}개가 나왔어요\n` +
      `${cards.map((c) => c.route.destination).join(' · ')}\n` +
      `직무명이 아니라 역량으로 커리어를 연결해 주는 서비스예요.\n${CONTEST_URL}`;

  const fileName = chosen
    ? `career-navi-${chosen.route.destination}.png`
    : 'career-navi-경로3개.png';

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

      {/* 카드 고르기. radio 로 두는 이유는 하나만 고를 수 있고,
          키보드 화살표로 옮겨 다닐 수 있기 때문이다. */}
      <fieldset className="share-picker">
        <legend>저장할 카드</legend>
        <label>
          <input type="radio" name="share-card" value="all" checked={picked === 'all'} onChange={() => setPicked('all')} />
          <span>
            <strong>경로 {cards.length}개 모두</strong>
            <em>{cards.map((c) => c.route.destination).join(' · ')}</em>
          </span>
        </label>
        {cards.map((c, i) => (
          <label key={c.route.destination}>
            <input type="radio" name="share-card" value={String(i)} checked={picked === String(i)} onChange={() => setPicked(String(i))} />
            <span>
              <strong>
                {c.route.destination}
                {c.route.isHiddenRoute && <b>이 길도 있어요</b>}
              </strong>
              <em>필수 역량 {c.total}개 중 {c.held}개 보유</em>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={chosen ? `${chosen.route.destination} 카드 미리보기` : '경로 요약 카드 미리보기'} className="w-full" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={imageUrl}
          download={fileName}
          className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-canvas transition-opacity hover:opacity-85"
        >
          이미지 저장
        </a>
        <button
          onClick={copy}
          className="rounded-full border border-hairline bg-elevated px-4 py-2.5 text-[14px] text-ink transition-colors hover:border-link/50"
        >
          {copied ? '복사됨' : '공유 문구 복사'}
        </button>
      </div>
    </section>
  );
}
