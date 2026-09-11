import './employer.css';
import Link from 'next/link';
import EmployerWorkspace from '@/components/EmployerWorkspace';
import SyntheticNotice from '@/components/SyntheticNotice';

export default function EmployerPage() {
  return (
    <main className="employer-page">
      <header className="employer-header">
        <Link href="/" className="text-[12px] text-faint transition-colors hover:text-ink">
          ← Career Navi
        </Link>
        <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Employer workspace</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug tracking-[-0.04em] text-ink sm:text-3xl">
          우리 팀의 다음 동료,<br className="hidden sm:block" /> 경험과 역량에서 찾으세요.
        </h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-[1.7] text-body">
          직접 작성하거나 AI로 초안을 만든 뒤 추천 인재를 확인하고, 기존 공고의 지원자 전형도 함께 관리합니다.
        </p>
      </header>

      <div className="mt-6 max-w-2xl"><SyntheticNotice /></div>
      <EmployerWorkspace />

      <footer className="mt-16 border-t border-hairline pt-6 text-[11px] leading-[1.6] text-faint">
        회사·공고·지원자·추천 인재는 모두 가상 데이터입니다. 공고 초안과 상태 변경은 현재 세션에만 적용되며 서버나 DB에 저장되지 않습니다.
      </footer>
    </main>
  );
}
