import Link from 'next/link';
import { notFound } from 'next/navigation';
import DemoApplication from '@/components/DemoApplication';
import SyntheticNotice from '@/components/SyntheticNotice';
import { JOB_POSTINGS, companyById, postingById } from '@/lib/company-index';


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
    <main className="mx-auto max-w-xl px-5 py-12 sm:py-16">
      <Link href={`/jobs/${posting.id}`} className="text-xs opacity-45 transition hover:opacity-90">← 공고로 돌아가기</Link>
      <header className="mt-6">
        <p className="text-sm opacity-55">{company.name}</p>
        <h1 className="mt-1 text-2xl font-bold">{posting.title} 지원 준비</h1>
      </header>

      <div className="mt-6"><SyntheticNotice /></div>

      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">제출 자료</h2>
        <ul className="mt-3 space-y-2 text-sm opacity-70">
          {posting.applicationDocuments.map((document) => <li key={document}>· {document}</li>)}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">예상 전형</h2>
        <ol className="mt-3 space-y-2 text-sm opacity-70">
          {posting.hiringProcess.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
        </ol>
      </section>

      <p className="mt-6 text-xs leading-relaxed opacity-50">
        로그인, 파일 업로드, 개인정보 입력은 받지 않습니다. 아래 버튼은 화면 흐름만 확인하며 네트워크 요청이나 저장을 수행하지 않습니다.
      </p>
      <div className="mt-4">
        <DemoApplication companyName={company.name} postingTitle={posting.title} />
      </div>
    </main>
  );
}
