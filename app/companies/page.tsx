import { Building2 } from 'lucide-react';
import CompanyDirectory from '@/components/CompanyDirectory';
import SyntheticNotice from '@/components/SyntheticNotice';

export default function CompaniesPage() {
  return (
    <main id="main-content" className="site-container py-10 sm:py-12">
      <header>
        <p className="eyebrow"><Building2 className="size-4" />회사·채용공고 탐색</p>
        <h1 className="mt-3 text-[30px] font-semibold text-ink sm:text-[38px]">다음 경험을 쌓을 곳을 살펴보세요.</h1>
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
