// ============================================================================
//  지원 흐름 체험
//  화면은 리디자인(v2)을 정식 채택했다. 실제 지원서는 전송되지 않는다.
// ============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import CompanyMarkV2 from '@/components/redesign/CompanyMarkV2';
import DemoApplicationV2 from '@/components/redesign/DemoApplicationV2';
import RedesignHeader from '@/components/redesign/RedesignHeader';
import RedesignFooter from '@/components/redesign/RedesignFooter';
import { JOB_POSTINGS, companyById, postingById, careerLabel, WORK_MODE_LABEL } from '@/lib/company-index';
import '@/app/redesign.css';
import '@/app/preview/detail-v2.css';

export function generateStaticParams() {
  return JOB_POSTINGS.map((posting) => ({ postingId: posting.id }));
}

export default async function ApplyPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params;
  const posting = postingById(postingId);
  if (!posting) notFound();
  const company = companyById(posting.companyId);
  if (!company) notFound();

  return (
    <div className="navi-v2 detail-v2">
      <RedesignHeader active="companies" />
      <main className="v2-main">
        <div className="wrap">
          <Link href={`/jobs/${posting.id}`} className="back"><ArrowLeft size={14} aria-hidden />공고로 돌아가기</Link>
          <header className="d-hero rv">
            <span className="overline">Your next step</span>
            <h1 className="hd">다음 도전을 준비해볼까요?</h1>
            <p className="d-tagline">공고에서 안내하는 자료와 절차를 확인하고, 지원 흐름을 체험해보세요.</p>
            <div className="apply-posting"><CompanyMarkV2 company={company} /><div><p>{company.name}</p><h2>{posting.title}</h2><span>{careerLabel(posting)} · {posting.location} · {WORK_MODE_LABEL[posting.workMode]}</span></div></div>
            <p className="synthetic"><strong>가상 기업·데모 공고</strong> · 실제 회사나 실제 채용이 아니며, 서비스 흐름을 확인하기 위해 생성한 데이터입니다.</p>
          </header>

          <div className="d-layout">
            <div className="d-body">
              <section className="d-section rv rv-2">
                <div className="sec-head-inline"><span className="num">01</span><span className="rule" /><div><span className="overline">Documents</span><h2 className="hd">준비할 자료를 확인하세요</h2></div></div>
                <p className="d-copy">공고에 기재된 제출 자료입니다. 이 데모에서는 파일을 받지 않습니다.</p>
                <ul className="apply-docs">{posting.applicationDocuments.map((doc, i) => <li key={`${i}-${doc}`}><span className="ico"><FileText size={18} aria-hidden /></span><p>{doc}</p></li>)}</ul>
                {!posting.applicationDocuments.length && <p className="d-empty">별도로 기재된 제출 자료가 없습니다.</p>}
              </section>
              <section className="d-section rv rv-3">
                <div className="sec-head-inline"><span className="num">02</span><span className="rule" /><div><span className="overline">Process</span><h2 className="hd">이런 과정을 거쳐요</h2></div></div>
                <p className="d-copy">공고에서 안내하는 예상 채용 절차입니다.</p>
                <ol className="d-values">{posting.hiringProcess.map((step, i) => <li key={`${i}-${step}`}><span className="num">{String(i + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
              </section>
            </div>
            <aside className="d-side rv rv-2">
              <DemoApplicationV2 companyName={company.name} postingTitle={posting.title} postingId={posting.id} companyId={company.id} />
            </aside>
          </div>
        </div>
      </main>
      <RedesignFooter />
    </div>
  );
}
