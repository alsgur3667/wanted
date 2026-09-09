'use client';

import { useEffect, useRef, useState } from 'react';
import CareerMap from './CareerMap';
import { DESTINATIONS } from '@/lib/career-map';

// ============================================================================
//  경로 탐색 화면
//
//  분석이 이미 끝났어도 이 화면을 거친다. 일부러 기다리게 하는 것이라
//  이유를 적어 둔다.
//
//  1) 여기서 무슨 일이 일어나는지 보여줄 유일한 순간이다. 결과만 튀어나오면
//     사람은 그것을 목록으로 읽는다. 세 문장을 지나며 "이게 경로를 찾는
//     일이구나"를 알게 되면 같은 결과가 다르게 읽힌다.
//  2) 이 제품의 이름이 내비다. 내비는 원래 경로를 '탐색'한다.
//
//  ⚠️ 다만 이건 연출이지 진행률이 아니다. 그래서 퍼센트 막대를 쓰지 않는다.
//     막대는 실제 진행을 재고 있다는 약속인데 우리는 재고 있지 않다.
//     문구를 순서대로 넘기는 것까지가 정직한 선이다.
// ============================================================================

const STEPS = [
  '경로를 찾는 중입니다',
  '최적 경로를 찾는 중입니다',
  '최소 환승을 찾는 중입니다',
] as const;

const STEP_MS = 1500;

export default function RouteSearchLoader({
  /** 결과가 도착했는지. 문구가 다 끝나도 이게 false 면 계속 기다린다 */
  ready,
  onDone,
}: {
  ready: boolean;
  onDone: () => void;
}) {
  // 한 박자마다 1씩 오른다. 세 박자가 한 바퀴다.
  const [tick, setTick] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), STEP_MS);
    return () => clearInterval(id);
  }, []);

  const step = tick % STEPS.length;
  const lap = Math.floor(tick / STEPS.length);
  /** 방금 한 바퀴를 마쳤는가 */
  const lapDone = tick > 0 && step === 0;

  // 문구는 셋, 경로는 다섯이라 수가 안 맞는다. 박자에 맞춰 나눠 그린다 —
  // 마지막 문구에서 마지막 경로(앰버, '몰랐던 길')가 나오는 게 중요하다.
  const reveal = Math.ceil(((step + 1) / STEPS.length) * DESTINATIONS.length);

  // 연출과 실제 분석 중 늦은 쪽을 기다린다.
  //
  // 결과가 아직이면 멈춰 서지 않고 한 바퀴를 더 돈다. 마지막 경로까지 그린 채로
  // 가만히 있으면 다 끝났는데 화면이 굳은 것처럼 보인다 — 실제로 기다리는
  // 중이라면 계속 찾고 있는 것처럼 보여야 한다.
  //
  // onDone 은 부모가 매 렌더마다 새로 만드는 함수라 이 효과가 여러 번 돈다.
  // 넘어가는 일은 한 번뿐이어야 하므로 발사 여부를 ref 로 잠근다.
  useEffect(() => {
    if (lapDone && ready && !fired.current) {
      fired.current = true;
      onDone();
    }
  }, [lapDone, ready, onDone]);

  return (
    <div
      className="animate-fade flex min-h-[70vh] flex-col items-center justify-center"
      role="status"
      aria-live="polite"
    >
      {/* 경로가 한 줄씩 늘어난다. 문구와 같은 박자로 움직여야
          글이 그림을 설명하는 게 아니라 둘이 같은 말을 하게 된다.

          key 에 바퀴 수를 넣어 매 바퀴 지도를 다시 마운트한다. CSS 애니메이션은
          한 번 끝나면 다시 재생되지 않아서, 이렇게 하지 않으면 두 바퀴째부터
          경로가 그려지지 않고 그냥 나타나 버린다. */}
      <div className="map-searching w-full max-w-[760px]">
        <CareerMap key={lap} reveal={reveal} />
      </div>

      <div className="mt-6 text-center">
        <p className="text-[15px] font-medium tracking-[-0.02em] text-ink">{STEPS[step]}</p>

        {/* 몇 번째 단계인지 점으로만 알린다 */}
        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === step ? 'w-6 bg-link' : i < step ? 'w-1.5 bg-link/40' : 'w-1.5 bg-hairline'
              }`}
            />
          ))}
        </div>

        <p className="mt-5 text-[12px] text-faint">
          {lap > 0 && !ready
            ? '분석 결과를 기다리는 중입니다'
            : '공공 직업 데이터에서 역량이 겹치는 직무를 견주고 있습니다'}
        </p>
      </div>
    </div>
  );
}
