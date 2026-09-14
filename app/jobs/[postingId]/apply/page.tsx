import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import CompanyMark from '@/components/CompanyMark';
import DemoApplication from '@/components/DemoApplication';
import SyntheticNotice from '@/components/SyntheticNotice';
import { JOB_POSTINGS, companyById, postingById, careerLabel, WORK_MODE_LABEL } from '@/lib/company-index';
import './apply.css';

export function generateStaticParams() {
  return JOB_POSTINGS.map(posting => ({ postingId: posting.id }));
}

export default async function ApplyPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params;
  const posting = postingById(postingId);
  if (!posting) notFound();
  const company = companyById(posting.companyId);
  if (!company) notFound();

  return <main className="application-page">
    <Link href={`/jobs/${posting.id}`} className="application-back"><ArrowLeft size={14} aria-hidden />공고로 돌아가기</Link>
    <header className="application-header">
      <p className="application-eyebrow">YOUR NEXT STEP</p>
      <h1>다음 도전을 준비해볼까요?</h1>
      <p>공고에서 안내하는 자료와 절차를 확인하고, 지원 흐름을 체험해보세요.</p>
    </header>
    <div className="application-posting"><CompanyMark company={company} /><div><p>{company.name}</p><h2>{posting.title}</h2><span>{careerLabel(posting)} · {posting.location} · {WORK_MODE_LABEL[posting.workMode]}</span></div></div>
    <div className="application-notice"><SyntheticNotice /></div>
    <div className="application-layout">
      <div className="application-preparation">
        <section className="application-section">
          <p className="application-eyebrow">01 · DOCUMENTS</p><h2>준비할 자료를 확인하세요</h2>
          <p className="application-description">공고에 기재된 제출 자료입니다. 이 데모에서는 파일을 받지 않습니다.</p>
          <ul className="application-documents">{posting.applicationDocuments.map((document, index) => <li key={`${index}-${document}`}><span><FileText size={19} aria-hidden /></span><p>{document}</p></li>)}</ul>
          {!posting.applicationDocuments.length && <p className="application-description">별도로 기재된 제출 자료가 없습니다.</p>}
        </section>
        <section className="application-section">
          <p className="application-eyebrow">02 · PROCESS</p><h2>이런 과정을 거쳐요</h2>
          <p className="application-description">공고에서 안내하는 예상 채용 절차입니다.</p>
          <ol className="application-process">{posting.hiringProcess.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
        </section>
      </div>
      <DemoApplication companyName={company.name} postingTitle={posting.title} postingId={posting.id} companyId={company.id} />
    </div>
  </main>;
}
