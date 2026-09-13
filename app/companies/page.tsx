import './companies.css';
import CompanyDirectory from '@/components/CompanyDirectory';
import SyntheticNotice from '@/components/SyntheticNotice';

export default function CompaniesPage() {
  return (
    <main className="company-page">
      <header className="company-hero">
<h1 className="text-2xl font-bold text-ink sm:text-3xl">함께 성장할 팀을 찾아보세요.</h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-[1.6] text-body">
          산업, 조직 규모, 근무 방식과 채용 중인 직무를 함께 확인할 수 있습니다.
        </p>
      </header>
      <div className="mt-3">
        <SyntheticNotice />
      </div>
      <CompanyDirectory />
    </main>
  );
}
