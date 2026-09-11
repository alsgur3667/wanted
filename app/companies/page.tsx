import './companies.css';
import Link from 'next/link';
import CompanyDirectory from '@/components/CompanyDirectory';
import SyntheticNotice from '@/components/SyntheticNotice';

export default function CompaniesPage() {
  return (
    <main className="company-page">
      <header className="company-hero">
        <Link href="/" className="text-[12px] text-faint transition-colors hover:text-ink">
          ← Career Navi
        </Link>
        <p className="company-eyebrow mt-8">FIND YOUR NEXT TEAM</p><h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">함께 성장할 팀을 찾아보세요.</h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-[1.6] text-body">
          산업, 조직 규모, 근무 방식과 채용 중인 직무를 함께 확인할 수 있습니다.
        </p>
      </header>
      <div className="mt-6">
        <SyntheticNotice />
      </div>
      <CompanyDirectory />
    </main>
  );
}
