'use client';

import { useEffect, useRef, useState } from 'react';

// ============================================================================
//  숫자가 세어 올라간다
//
//  1,435 라는 결과만 툭 놓이면 그냥 적어 둔 숫자로 읽힌다. 세어 올라가는 걸
//  보고 나면 "실제로 센 것"이 된다. 이 화면에서 그 인상이 필요한 이유는
//  왼쪽 지도가 예쁠수록 "지어낸 화면 아니냐"는 의심이 붙기 때문이다.
//
//  ⚠️ 자리수가 바뀔 때 글자 폭이 달라지면 옆 글자가 밀린다.
//     tabular-nums 로 숫자 폭을 고정하고, 자릿수도 목표값에 맞춰 채운다.
//
//  ⚠️ setInterval 로 일정 간격마다 더하지 않는다. 프레임과 어긋나 툭툭 끊긴다.
//     requestAnimationFrame 으로 실제 흐른 시간을 재서 그 시점의 값을 계산한다.
//     느린 기기에서도 같은 시간에 끝난다.
// ============================================================================

/** 끝에서 부드럽게 멈춘다. 등속으로 세면 기계가 처리하는 것처럼 보인다 */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function CountUp({
  to,
  /** 세는 데 걸리는 시간(ms) */
  duration = 1100,
  /** 시작 전 기다리는 시간(ms). 등장 애니메이션이 끝난 뒤에 세기 시작한다 */
  delay = 0,
  className = '',
}: {
  to: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const [value, setValue] = useState(to);
  const done = useRef(false);

  useEffect(() => {
    // 움직임을 줄여 달라고 한 사용자에게는 결과만 보여준다
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let raf = 0;
    let start = 0;

    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * easeOut(t)));
      if (t < 1) raf = requestAnimationFrame(step);
      else done.current = true;
    };

    const timer = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);

  return (
    // 세는 동안에는 화면 낭독기가 매 프레임 읽지 않도록 막고,
    // 최종 값만 aria-label 로 한 번 전한다.
    <span className={className} aria-label={to.toLocaleString()}>
      <span aria-hidden>{value.toLocaleString()}</span>
    </span>
  );
}
