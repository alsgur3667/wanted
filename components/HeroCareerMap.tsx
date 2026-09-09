'use client';

import { useEffect, useState } from 'react';
import CareerMap from './CareerMap';
import { ROUTE_ROUNDS } from '@/lib/career-map';

// ============================================================================
//  히어로의 지도 — 계속 탐색한다
//
//  한 묶음을 그리고 멈추면 "이 서비스가 아는 길은 다섯 개"로 읽힌다.
//  묶음을 갈아 끼우며 매번 다른 점으로 길이 뻗으면, 갈 수 있는 곳은 훨씬 많고
//  지금 그중 다섯을 골라 보여주는 중이라는 게 설명 없이 전달된다.
//
//  ── 왜 지도 전체를 다시 마운트하나
//  CSS 애니메이션은 한 번 끝나면 다시 재생되지 않는다. key 를 바꿔 새로 마운트하는
//  것이 가장 확실하다. 다만 그러면 바닥·회사·출발지까지 다시 등장해 지도가
//  깜빡이므로, 첫 바퀴에서만 그것들을 등장시키고 이후에는 즉시 그린다
//  (animateBase). 경로만 새로 그려져 눈이 거기 머문다.
//
//  ── 시간
//  경로 다섯이 다 그려지는 데 약 2.6초. 남은 1.9초는 완성된 그림을 보는 시간이다.
//  이 여백이 없으면 계속 그리기만 하는 화면이 되어 정신없다.
// ============================================================================

const ROUND_MS = 4500;

export default function HeroCareerMap({ className = '' }: { className?: string }) {
  const [round, setRound] = useState(0);

  useEffect(() => {
    // 사용자가 움직임을 줄여 달라고 했으면 첫 묶음에서 멈춘다.
    // 화면 전체가 4.5초마다 바뀌는 건 그 설정이 막으려는 바로 그것이다.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) return;

    const id = setInterval(() => setRound((r) => (r + 1) % ROUTE_ROUNDS.length), ROUND_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <CareerMap
      key={round}
      destinations={ROUTE_ROUNDS[round]}
      animateBase={round === 0}
      className={className}
    />
  );
}
