'use client';

import { useEffect, useRef, useState } from 'react';

// ============================================================================
//  숫자가 세어 올라간다
//
//  1,435 라는 결과만 툭 놓이면 그냥 적어 둔 숫자로 읽힌다. 세어 올라가는 걸
//  보고 나면 "실제로 센 것"이 된다. 사진과 큰 글씨가 많은 화면일수록
//  "지어낸 거 아니냐"는 의심이 붙는데, 그 의심을 끊는 자리가 여기다.
//
//  ⚠️ 처음 값은 0 이 아니라 최종값이다.
//     서버가 그리는 HTML 과 자바스크립트가 꺼진 브라우저에는 이 값이 그대로
//     남는다. 0 으로 두면 스크립트가 안 돌 때 "0 건"이 박혀 버린다.
//     셀 준비가 끝난 뒤에 0 으로 내렸다가 올라간다.
//
//  ⚠️ 자리수가 바뀔 때 글자 폭이 달라지면 옆 글자가 밀린다.
//     받는 쪽에서 tabular-nums 로 숫자 폭을 고정해 둔다.
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
  duration = 1400,
  /** 시작 전 기다리는 시간(ms). 등장 애니메이션이 끝난 뒤에 세기 시작한다 */
  delay = 0,
  /** 화면에 들어올 때 세기 시작한다. 끄면 마운트 직후 */
  startOnView = false,
  className = '',
}: {
  to: number;
  duration?: number;
  delay?: number;
  startOnView?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(to);
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    // 움직임을 줄여 달라고 한 사용자에게는 결과만 보여준다
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;

    const run = () => {
      if (fired.current) return;
      fired.current = true;
      setValue(0);

      let start = 0;
      const step = (now: number) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * easeOut(t)));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      timer = setTimeout(() => {
        raf = requestAnimationFrame(step);
      }, delay);
    };

    if (!startOnView) {
      run();
      return () => {
        if (timer) clearTimeout(timer);
        if (raf) cancelAnimationFrame(raf);
      };
    }

    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      run();
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            run();
            observer?.disconnect();
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(element);
    }

    return () => {
      observer?.disconnect();
      if (timer) clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration, delay, startOnView]);

  return (
    // 세는 동안에는 화면 낭독기가 매 프레임 읽지 않도록 막고,
    // 최종 값만 aria-label 로 한 번 전한다.
    <span ref={ref} className={className} aria-label={to.toLocaleString()}>
      <span aria-hidden>{value.toLocaleString()}</span>
    </span>
  );
}
