import Link from 'next/link';
import CompanyDirectory from '@/components/CompanyDirectory';
import SyntheticNotice from '@/components/SyntheticNotice';


export default function CompaniesPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <header>
        <Link href="/" className="text-xs opacity-45 transition hover:opacity-90">← 커리어 내비</Link>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">회사와 채용공고 둘러보기</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-60">
          산업, 조직 규모, 근무 방식과 채용 중인 직무를 함께 확인할 수 있습니다.
        </p>
      </header>
      <div className="mt-6"><SyntheticNotice /></div>
      <CompanyDirectory />
    </main>
  );
}
