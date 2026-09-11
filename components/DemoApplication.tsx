'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';

// Demo only: no application request, file upload or persistence.
export default function DemoApplication({ companyName, postingTitle, postingId, companyId }: {
  companyName: string;
  postingTitle: string;
  postingId: string;
  companyId: string;
}) {
  const [complete, setComplete] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (complete) titleRef.current?.focus({ preventScroll: true });
  }, [complete]);

  return <section className={`application-confirm ${complete ? 'is-complete' : ''}`} aria-labelledby="application-confirm-title">
    <p className="application-eyebrow">03 · {complete ? 'COMPLETE' : 'DEMO EXPERIENCE'}</p>
    {complete ? <>
      <span className="application-complete-icon"><Check size={24} aria-hidden /></span>
      <h2 ref={titleRef} tabIndex={-1} id="application-confirm-title">데모 지원 과정을<br />모두 확인했어요.</h2>
      <p className="application-description">실제 지원서는 전송되지 않았으며, 지원 정보도 저장되지 않았습니다.</p>
      <div className="application-confirm-job"><span>{companyName}</span><strong>{postingTitle}</strong></div>
      <Link href={`/companies/${companyId}`} className="application-primary">회사의 다른 공고 보기<ArrowRight size={16} aria-hidden /></Link>
      <Link href={`/jobs/${postingId}`} className="application-secondary">이 공고 다시 보기</Link>
      <button type="button" onClick={() => setComplete(false)} className="application-restart"><RotateCcw size={13} aria-hidden />데모 다시 보기</button>
    </> : <>
      <h2 id="application-confirm-title">지원 흐름을<br />미리 확인해보세요.</h2>
      <p className="application-description">자료와 채용 절차를 살펴보셨다면, 아래 버튼으로 데모 완료 화면까지 확인할 수 있습니다.</p>
      <div className="application-confirm-job"><span>{companyName}</span><strong>{postingTitle}</strong></div>
      <ul className="application-demo-notes"><li><Check size={14} aria-hidden />로그인·개인정보 입력 없이 체험</li><li><Check size={14} aria-hidden />파일 업로드나 지원서 전송 없음</li><li><Check size={14} aria-hidden />지원 정보 저장 없음</li></ul>
      <button type="button" onClick={() => setComplete(true)} className="application-primary">데모 지원 확인하기<ArrowRight size={16} aria-hidden /></button>
      <p className="application-small">실제 채용에 지원하는 버튼이 아닙니다.</p>
    </>}
  </section>;
}
