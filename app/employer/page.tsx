import Link from 'next/link';
import { BriefcaseBusiness, ArrowUpRight } from 'lucide-react';
import EmployerWorkspace from '@/components/EmployerWorkspace';

export default function EmployerPage() {
  return (
    <main id="main-content" className="site-container py-8 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-6">
        <div><p className="eyebrow"><BriefcaseBusiness className="size-4" />기업 · 채용 워크스페이스</p><h1 className="mt-3 text-[30px] font-semibold text-ink">채용 관리</h1><p className="mt-2 text-sm leading-6 text-body">공고별 지원 현황을 확인하고, 역량 근거를 바탕으로 다음 전형을 검토하세요.</p></div>
        <Link href="/companies" className="action-secondary">회사·공고 둘러보기<ArrowUpRight className="size-4" /></Link>
      </header>
      <EmployerWorkspace />
      <footer className="mt-10 border-t border-hairline pt-5 text-xs leading-6 text-mute">데모 워크스페이스 · 회사·공고·지원자는 가상 데이터입니다. 작성 내용과 전형 상태는 서버에 저장되지 않으며 새로고침하면 초기화됩니다.</footer>
    </main>
  );
}
