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
  /**
   * 요소 위쪽이 화면 위쪽에 닿은 뒤, 여기까지 더 내려가는 동안은 아무 일도 없다(px).
   * 조금 움직였다고 화면이 반응하면 예민하게 느껴진다.
   */
  start = 140,
  /** start 를 지난 뒤 이 거리(px) 동안 사라진다 */
  distance = 720,
  /** 사라지는 동안 위로 떠오르는 거리(px) */
  lift = 56,
  /** 뒤로 눕는 각도(deg). 0이면 평면으로 밀려난다 */
  tilt = 26,
  /** 화면에서 멀어지는 거리(px). 원근이 걸려 있어 작아 보인다 */
  depth = 220,
  /** 사라지는 동안 흐려지는 최대 반경(px). 0이면 흐려지지 않는다 */
  blur = 8,
  className = '',
}: {
  children: React.ReactNode;
  start?: number;
  distance?: number;
  lift?: number;
  tilt?: number;
  depth?: number;
  blur?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const stage = stageRef.current;
    if (!el || !stage) return;

    // 움직임을 줄여 달라고 한 사용자에게는 그냥 둔다.
    // 스크롤할 때마다 화면이 변하는 건 그 설정이 막으려는 바로 그것이다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 흐림은 값이 실제로 바뀔 때만 다시 쓴다. 같은 문자열을 대입해도
    // 스타일 재계산이 걸리고, filter 는 그때마다 다시 그려야 해서 비싸다.
    let lastBlur = -1;

    // 문서 기준 제 위치를 한 번만 잰다.
    //
    // scrollY 를 그대로 쓰면 문서 맨 위에 있는 요소에서만 맞는다. 아래쪽 요소는
    // 페이지를 열자마자 이미 다 사라진 상태로 시작한다. 자기 위치를 빼 주면
    // 어디에 있든 "내가 화면 위로 올라간 만큼"이 된다.
    //
    // 스크롤 루프 안에서 재지 않는 이유는, getBoundingClientRect 가 그 자리에서
    // 레이아웃을 강제로 다시 계산하기 때문이다. 프레임마다 그러면 느려진다.
    // 재는 대상은 바깥 상자다 — 안쪽은 우리가 transform 으로 움직이므로 위치가 변한다.
    let top = 0;
    const measure = () => {
      top = stage.getBoundingClientRect().top + window.scrollY;
    };

    let raf = 0;
    const apply = () => {
      raf = 0;
      const raw = Math.min(1, Math.max(0, (window.scrollY - top - start) / distance));

      // 진행도를 그대로 쓰면 처음부터 일정한 속도로 사라져, 조금만 내려도
      // 화면이 크게 반응하는 것처럼 느껴진다. 제곱을 씌워 초반을 눌러 둔다 —
      // 앞부분은 거의 가만히 있다가 뒤로 갈수록 빨라진다.
      const p = raw * raw;

      // 흐려지는 쪽을 조금 빠르게 — 다 사라진 뒤에도 자리만 차지하면
      // 아래 내용이 늦게 올라오는 것처럼 보인다.
      const opacity = Math.max(0, 1 - p * 1.15);
      el.style.opacity = String(opacity);
      // 다 사라진 뒤에도 안에 있는 링크는 여전히 눌리고 탭 순서에도 남는다.
      // 보이지 않는 버튼이 클릭을 먹는 건 버그로 읽힌다.
      el.style.pointerEvents = opacity < 0.05 ? 'none' : '';
      // 위로 뜨고(translateY) · 뒤로 물러나고(translateZ) · 뒤로 눕는다(rotateX).
      // 셋이 같이 가야 '멀어진다'로 읽힌다. translateY 만 쓰면 그냥 밀려난다.
      el.style.transform =
        `translate3d(0, ${-p * lift}px, ${-p * depth}px) rotateX(${p * tilt}deg)`;

      // 초점이 빠지면서 멀어진다. opacity 가 p≈0.87 에서 0이 되므로, 흐림은
      // 그보다 일찍(1.7배) 최대에 닿아야 사라지기 전에 눈에 보인다.
      //
      // 0.5px 단위로 끊는다. filter 는 값이 바뀔 때마다 그 영역을 통째로 다시
      // 그리는데, 히어로는 화면만 한 크기라 프레임마다 새로 그리면 버벅인다.
      // 0.5px 차이는 눈에 안 보이지만 다시 그리는 횟수는 크게 줄어든다.
      if (blur > 0) {
        const next = Math.min(blur, Math.round(p * blur * 1.7 * 2) / 2);
        if (next !== lastBlur) {
          lastBlur = next;
          el.style.filter = next > 0 ? `blur(${next}px)` : '';
        }
      }
    };

    // ⚠️ scroll 이벤트에 기대지 않는다.
    //
    // Lenis(components/SmoothScroll.tsx)가 스크롤을 자기 방식으로 옮기면서
    // window 의 scroll 이벤트를 내보내지 않는다. scrollY 값은 정상으로 바뀌는데
    // 이벤트만 안 뜨기 때문에, 리스너로 만든 애니메이션은 조용히 멈춰 있는다.
    // 실제로 이것 때문에 히어로 퇴장이 통째로 죽어 있었다.
    //
    // 그래서 프레임마다 scrollY 를 직접 본다. 값이 그대로면 아무 일도 하지 않으므로
    // 가만히 있을 때의 비용은 숫자 비교 한 번이다.
    let lastY = -1;
    let running = false;
    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (window.scrollY === lastY) return;
      lastY = window.scrollY;
      apply();
    };

    // 화면 근처에 있을 때만 돈다. 여섯 군데가 종일 rAF 를 돌릴 이유는 없다.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting === running) return;
        running = entry.isIntersecting;
        if (running) {
          lastY = -1;
          raf = requestAnimationFrame(tick);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
          // 멈추기 전에 마지막 상태를 한 번 맞춘다. 화면 밖으로 빠르게
          // 지나가면 중간 값에서 굳은 채로 남을 수 있다.
          apply();
        }
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(stage);

    // 창 크기가 바뀌면 위쪽 내용의 높이가 달라져 제 위치도 같이 움직인다.
    const onResize = () => {
      measure();
      apply();
    };

    // 새로고침으로 중간 위치에서 시작할 수도 있다. 처음에 한 번 맞춰 둔다.
    measure();
    apply();
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [start, distance, lift, tilt, depth, blur]);

  // 원근은 부모가 가진다. 자식에 perspective 를 주면 자기 자신에게는 적용되지
  // 않아 아무리 rotateX 를 걸어도 납작하게 눌린 그림만 나온다.
  //
  // 소실점을 위쪽(50% 0%)에 둔다. 지도 자체가 아래(가까움)에서 위(멂)로
  // 뻗은 원근이라, 같은 방향으로 물러나야 한 장면처럼 이어진다.
  //
  // 회전축은 아래 끝(50% 100%). 가까운 쪽 모서리를 붙잡고 먼 쪽이 넘어가야
  // 바닥이 눕는 것처럼 보인다. 가운데를 축으로 하면 판이 제자리에서 도는 느낌이 난다.
  return (
    <div ref={stageRef} className={className} style={{ perspective: '1100px', perspectiveOrigin: '50% 0%' }}>
      <div
        ref={ref}
        style={{ transformOrigin: '50% 100%', willChange: 'opacity, transform, filter' }}
      >
        {children}
      </div>
    </div>
  );
}
