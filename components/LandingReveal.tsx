'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// ============================================================================
//  화면에 들어오면 떠오른다
//
//  ⚠️ 자바스크립트가 죽거나 IntersectionObserver 가 없으면 아무것도 안 한다.
//     그러면 내용은 그냥 보인다. 숨겨 놓고 못 꺼내는 것보다 안 숨기는 편이 낫다.
//     그래서 `data-reveal` 을 CSS 가 아니라 JS 가 붙인다.
//
//  ── 방향
//  전부 아래에서 올라오면 화면이 한 방향으로만 흐른다. 좌우로 나뉜 구역
//  (사진 ↔ 글)은 각자 자기 자리에서 밀려 들어와야 그 배치가 의도로 읽힌다.
//
//  ── 시차
//  3단계 설명이나 통계 4개가 동시에 나타나면 한 덩어리로 보인다.
//  0.09초씩 밀면 눈이 왼쪽부터 차례로 따라가고, 그 자체가 '순서'를 말한다.
//  값은 인라인 CSS 변수(--rvd)로 내려 CSS 가 transition-delay 로 받는다.
// ============================================================================

export default function LandingReveal({
  children,
  className = '',
  /** 어느 쪽에서 밀려 들어올지 */
  from = 'up',
  /** 시작을 늦출 시간(초). 같은 묶음 안에서 순서대로 나타나게 할 때 쓴다 */
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  from?: 'up' | 'left' | 'right';
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    // 처음부터 화면 안에 있는 것은 숨기지 않는다. 첫 화면이 비어 보이면 안 된다.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset.reveal = 'waiting';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.reveal = 'visible';
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-from={from === 'up' ? undefined : from}
      className={`navi-reveal ${className}`}
      style={delay ? ({ ['--rvd' as string]: `${delay}s` }) : undefined}
    >
      {children}
    </div>
  );
}
