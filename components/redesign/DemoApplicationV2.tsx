'use client';

// ============================================================================
//  DemoApplicationV2.tsx — Career Navi · 2026-09-17
//  데모 지원 확인 카드. 동작(전송·저장 없음, 완료 화면 토글)은 DemoApplication 과 같다.
//  링크만 미리보기 라우트(/preview/...)로 향한다.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';

export default function DemoApplicationV2({ companyName, postingTitle, postingId, companyId }: {
  companyName: string; postingTitle: string; postingId: string; companyId: string;
}) {
  const [complete, setComplete] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (complete) titleRef.current?.focus({ preventScroll: true }); }, [complete]);

  return (
    <section className={`apply-card${complete ? ' is-complete' : ''}`} aria-labelledby="apply-title-v2">
      <div className="sec-head-inline"><span className="num">03</span><span className="rule" /><span className="overline">{complete ? 'Complete' : 'Demo experience'}</span></div>
      {complete ? (
        <>
          <span className="apply-check"><Check size={24} aria-hidden /></span>
          <h2 ref={titleRef} tabIndex={-1} id="apply-title-v2" className="hd">데모 지원 과정을<br />모두 확인했어요.</h2>
          <p className="d-copy">실제 지원서는 전송되지 않았으며, 지원 정보도 저장되지 않았습니다.</p>
          <div className="apply-job"><span>{companyName}</span><strong>{postingTitle}</strong></div>
          <Link href={`/preview/companies-v2/${companyId}`} className="btn btn-dark">회사의 다른 공고 보기 <ArrowRight size={16} aria-hidden /></Link>
          <Link href={`/preview/jobs-v2/${postingId}`} className="textlink">이 공고 다시 보기</Link>
          <button type="button" onClick={() => setComplete(false)} className="apply-restart"><RotateCcw size={13} aria-hidden />데모 다시 보기</button>
        </>
      ) : (
        <>
          <h2 id="apply-title-v2" className="hd">지원 흐름을<br />미리 확인해보세요.</h2>
          <p className="d-copy">자료와 채용 절차를 살펴보셨다면, 아래 버튼으로 데모 완료 화면까지 확인할 수 있습니다.</p>
          <div className="apply-job"><span>{companyName}</span><strong>{postingTitle}</strong></div>
          <ul className="apply-notes">
            <li><Check size={14} aria-hidden />로그인·개인정보 입력 없이 체험</li>
            <li><Check size={14} aria-hidden />파일 업로드나 지원서 전송 없음</li>
            <li><Check size={14} aria-hidden />지원 정보 저장 없음</li>
          </ul>
          <button type="button" onClick={() => setComplete(true)} className="btn btn-dark">데모 지원 확인하기 <ArrowRight size={16} aria-hidden /></button>
          <p className="d-note">실제 채용에 지원하는 버튼이 아닙니다.</p>
        </>
      )}
    </section>
  );
}
