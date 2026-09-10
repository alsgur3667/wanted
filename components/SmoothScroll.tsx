'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

// ============================================================================
//  부드러운 스크롤
//
//  브라우저 기본 휠 스크롤은 한 번 굴릴 때마다 100px 남짓 뚝뚝 끊어 옮긴다.
//  그 위에서 스크롤에 물린 애니메이션을 돌리면(우리 지도가 뒤로 눕는 것처럼)
//  움직임도 같이 계단이 된다. Lenis 는 목표 지점까지 매 프레임 보간해서
//  실제 스크롤 위치를 옮긴다 — 그래서 스크롤도, 거기 물린 것도 같이 매끄러워진다.
//
//  ── 왜 이 방식이 우리 코드를 안 건드리나
//  Lenis 는 가짜 스크롤이 아니라 진짜 scrollY 를 옮긴다. window 의 scroll 이벤트도
//  그대로 뜨고 position: sticky 도 정상 동작한다. ScrollFade 는 고칠 게 없다.
//
//  ⚠️ 손가락 스크롤은 건드리지 않는다(syncTouch 기본 false).
//     모바일은 OS 가 관성까지 계산해서 굴리는데, 그 위에 우리 보간을 얹으면
//     손끝과 화면이 어긋나 멀미가 난다. 휠과 키보드만 부드럽게 한다.
// ============================================================================

export default function SmoothScroll() {
  useEffect(() => {
    // 움직임을 줄여 달라고 한 사용자에게는 기본 스크롤을 그대로 둔다.
    // 화면이 손을 뗀 뒤에도 계속 움직이는 것이 그 설정이 막으려는 바로 그것이다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      // 목표까지 따라잡는 시간(초). 길수록 미끄럽지만 굼떠 보인다.
      duration: 1.0,
      // 끝에서 감속. 시작은 빠르게 붙고 끝만 부드럽게 선다.
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      wheelMultiplier: 1,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
