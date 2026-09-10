'use client';

import { useEffect, useRef } from 'react';

// ============================================================================
//  스크롤에 따라 위로 빠지며 사라진다
//
//  히어로의 지도는 첫 화면에서 할 일이 끝난다. 아래로 내려가면 갈림길을 읽어야
//  하는데, 지도가 그대로 붙어 따라 내려오면 시선이 둘로 나뉜다.
//  살짝 위로 떠오르며 흐려지게 하면 "이건 다 봤다"가 몸으로 전달된다.
//
//  ── 왜 CSS 스크롤 애니메이션(animation-timeline)을 안 썼나
//  문법은 이쪽이 훨씬 깔끔하다. 다만 아직 크로미움 계열에서만 동작한다.
//  심사에서 어떤 브라우저로 열지 모르는데 사파리에서 지도가 안 사라지는 것보다,
//  손으로 계산하더라도 어디서나 같게 보이는 편이 낫다.
//
//  ── 성능
//  스크롤마다 리액트를 다시 그리면 프레임이 떨어진다. ref 로 DOM 스타일을
//  직접 만지고, requestAnimationFrame 으로 프레임당 한 번만 계산한다.
//  transform 과 opacity 만 건드리므로 레이아웃을 다시 잡지 않는다.
// ============================================================================

export default function ScrollFade({
  children,
  /** 여기까지는 아무 일도 없다(px). 조금 움직였다고 화면이 반응하면 예민하게 느껴진다 */
  start = 140,
  /** start 를 지난 뒤 이 거리(px) 동안 사라진다 */
  distance = 720,
  /** 사라지는 동안 위로 떠오르는 거리(px) */
  lift = 56,
  /** 뒤로 눕는 각도(deg). 0이면 평면으로 밀려난다 */
  tilt = 26,
  /** 화면에서 멀어지는 거리(px). 원근이 걸려 있어 작아 보인다 */
  depth = 220,
  className = '',
}: {
  children: React.ReactNode;
  start?: number;
  distance?: number;
  lift?: number;
  tilt?: number;
  depth?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 움직임을 줄여 달라고 한 사용자에게는 그냥 둔다.
    // 스크롤할 때마다 화면이 변하는 건 그 설정이 막으려는 바로 그것이다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const raw = Math.min(1, Math.max(0, (window.scrollY - start) / distance));

      // 진행도를 그대로 쓰면 처음부터 일정한 속도로 사라져, 조금만 내려도
      // 화면이 크게 반응하는 것처럼 느껴진다. 제곱을 씌워 초반을 눌러 둔다 —
      // 앞부분은 거의 가만히 있다가 뒤로 갈수록 빨라진다.
      const p = raw * raw;

      // 흐려지는 쪽을 조금 빠르게 — 다 사라진 뒤에도 자리만 차지하면
      // 아래 내용이 늦게 올라오는 것처럼 보인다.
      el.style.opacity = String(Math.max(0, 1 - p * 1.15));
      // 위로 뜨고(translateY) · 뒤로 물러나고(translateZ) · 뒤로 눕는다(rotateX).
      // 셋이 같이 가야 '멀어진다'로 읽힌다. translateY 만 쓰면 그냥 밀려난다.
      el.style.transform =
        `translate3d(0, ${-p * lift}px, ${-p * depth}px) rotateX(${p * tilt}deg)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    // 새로고침으로 중간 위치에서 시작할 수도 있다. 처음에 한 번 맞춰 둔다.
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [start, distance, lift, tilt, depth]);

  // 원근은 부모가 가진다. 자식에 perspective 를 주면 자기 자신에게는 적용되지
  // 않아 아무리 rotateX 를 걸어도 납작하게 눌린 그림만 나온다.
  //
  // 소실점을 위쪽(50% 0%)에 둔다. 지도 자체가 아래(가까움)에서 위(멂)로
  // 뻗은 원근이라, 같은 방향으로 물러나야 한 장면처럼 이어진다.
  //
  // 회전축은 아래 끝(50% 100%). 가까운 쪽 모서리를 붙잡고 먼 쪽이 넘어가야
  // 바닥이 눕는 것처럼 보인다. 가운데를 축으로 하면 판이 제자리에서 도는 느낌이 난다.
  return (
    <div className={className} style={{ perspective: '1100px', perspectiveOrigin: '50% 0%' }}>
      <div
        ref={ref}
        style={{ transformOrigin: '50% 100%', willChange: 'opacity, transform' }}
      >
        {children}
      </div>
    </div>
  );
}
