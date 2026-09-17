'use client';

// ============================================================================
//  RouteSearchLoaderV2.tsx — Career Navi · 2026-09-17
//  분석 중 화면. 상태 전환 로직(tick · slow · complete)은 RouteSearchLoader 와
//  같고, 지도는 CareerMapV2 로 바꿨다. 경로가 1 → 2 → 3 → 4 → 5 순으로 그려지며
//  '찾는 중'을 보여준다. 결과가 준비되면 제목이 바뀌고 버튼이 나타난다.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { DESTINATIONS, ROUTE_ROUNDS } from '@/lib/career-map';
import CareerMapV2 from './CareerMapV2';

const STATUS = ['경로를 찾는 중입니다', '최적 경로를 찾는 중입니다', '최소 환승을 찾는 중입니다'];

export default function RouteSearchLoaderV2({ ready, onDone, onCancel, focusOnMount = true, forceSlow = false }: {
  ready: boolean;
  onDone: () => void;
  onCancel?: () => void;
  focusOnMount?: boolean;
  forceSlow?: boolean;
}) {
  const [slow, setSlow] = useState(false);
  const [tick, setTick] = useState(0);
  const complete = ready && tick >= 3;
  const round = ROUTE_ROUNDS[Math.floor(tick / 5) % ROUTE_ROUNDS.length] ?? DESTINATIONS;
  const reveal = complete ? round.length : (tick % 5) + 1;

  useEffect(() => {
    if (complete) return;
    const timer = setInterval(() => setTick((c) => c + 1), 1500);
    return () => clearInterval(timer);
  }, [complete]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [focusOnMount]);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="loader-v2" aria-labelledby="analysis-title-v2">
      <div className="loader-head">
        <span className="overline">Your next chapter</span>
        <h1 ref={headingRef} tabIndex={-1} id="analysis-title-v2" className="hd">
          <span className="title-stack">
            <span className={complete ? 'is-hidden' : ''} aria-hidden={complete}>경험을 연결해,<br />다음 가능성을 찾고 있어요.</span>
            <span className={complete ? '' : 'is-hidden'} aria-hidden={!complete}>다음 커리어를 살펴볼<br />준비가 됐어요.</span>
          </span>
        </h1>
        <p>입력한 경험을 바탕으로 역량과 직무의 연결점을 분석합니다.</p>
      </div>
      <div className={`loader-map${complete ? '' : ' map-searching'}`}>
        <CareerMapV2 key={`${Math.floor(tick / 5)}-${reveal}`} destinations={round} reveal={reveal} animateBase={tick === 0} compact />
      </div>
      <div className="loader-status" role="status" aria-live="polite">
        <span className={`loader-icon${complete ? ' is-ready' : ''}`}>
          {complete ? <Check size={18} aria-hidden /> : <Loader2 size={18} className="animate-spin" aria-hidden />}
        </span>
        <div>
          <strong>{complete ? '분석이 완료됐습니다' : STATUS[tick % 3]}</strong>
          <p>{complete ? '준비가 되셨다면 아래 버튼을 눌러 결과를 확인해주세요.' : (slow || forceSlow) ? '분석 결과를 기다리는 중입니다. 입력 내용은 그대로 유지됩니다.' : '경험 속 역량과 연결되는 직무를 살펴보고 있습니다.'}</p>
        </div>
      </div>
      <div className="loader-actions">
        {complete && <button type="button" className="btn btn-dark" onClick={onDone}>분석 결과 보기 <ArrowRight size={16} aria-hidden /></button>}
        {!complete && onCancel && <button type="button" className="loader-back" onClick={onCancel}>입력 화면으로 돌아가기</button>}
      </div>
      <p className="loader-note">지도는 탐색 과정을 표현한 예시이며, 실제 추천 직무는 분석 결과에서 확인할 수 있습니다.</p>
    </section>
  );
}
