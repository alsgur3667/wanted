'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import LoginJourney from './LoginJourney';
import '../app/login/login.css';
import './route-search-loader.css';

export default function RouteSearchLoader({ ready, onDone, onCancel, focusOnMount = true, forceSlow = false }: {
  ready: boolean;
  onDone: () => void;
  onCancel?: () => void;
  focusOnMount?: boolean;
  forceSlow?: boolean;
}) {
  const [slow, setSlow] = useState(false);
  const [tick, setTick] = useState(0);
  const complete = ready && tick >= 3;
  useEffect(() => {
    if (complete) return;
    const timer = setInterval(() => setTick(current => current + 1), 1500);
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
    <section className="analysis-loader" aria-labelledby="analysis-title">
      <div className="analysis-heading">
        <p className="analysis-eyebrow">YOUR NEXT CHAPTER</p>
        <h1 ref={headingRef} tabIndex={-1} id="analysis-title"><span className="analysis-title-stack"><span className={complete ? "is-hidden" : ""} aria-hidden={complete}>경험을 연결해,<br />다음 가능성을 찾고 있어요.</span><span className={complete ? "" : "is-hidden"} aria-hidden={!complete}>다음 커리어를 살펴볼<br />준비가 됐어요.</span></span></h1>
        <p>입력한 경험을 바탕으로 역량과 직무의 연결점을 분석합니다.</p>
      </div>
      <div className="analysis-map">
        <LoginJourney role="personal" />
      </div>
      <div className="analysis-status" role="status" aria-live="polite">
        <span className={complete ? 'analysis-status-icon is-ready' : 'analysis-status-icon'}>
          {complete ? <Check size={18} aria-hidden /> : <Loader2 size={18} className="animate-spin" aria-hidden />}
        </span>
        <div><strong>{complete ? '분석이 완료됐습니다' : ['경로를 찾는 중입니다', '최적 경로를 찾는 중입니다', '최소 환승을 찾는 중입니다'][tick % 3]}</strong>
          <p>{complete ? '준비가 되셨다면 아래 버튼을 눌러 결과를 확인해주세요.' : (slow || forceSlow) ? '분석 결과를 기다리는 중입니다. 입력 내용은 그대로 유지됩니다.' : '경험 속 역량과 연결되는 직무를 살펴보고 있습니다.'}</p>
        </div>
      </div>
      <div className="analysis-actions">
        {complete && <button className="analysis-result-button" onClick={onDone}>분석 결과 보기 <ArrowRight size={16} aria-hidden /></button>}
        {!complete && onCancel && <button className="analysis-back" onClick={onCancel}>입력 화면으로 돌아가기</button>}
      </div>
      <p className="analysis-map-note">지도는 탐색 과정을 표현한 예시이며, 실제 추천 직무는 분석 결과에서 확인할 수 있습니다.</p>
    </section>
  );
}
