import Link from 'next/link';
import EmployerWorkspace from '@/components/EmployerWorkspace';
import SyntheticNotice from '@/components/SyntheticNotice';


export default function EmployerPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <header>
        <Link href="/" className="text-[12px] text-faint transition-colors hover:text-ink">← 커리어 내비</Link>
        <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Employer workspace</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-ink sm:text-3xl">
          공고를 만들고, 역량 근거로<br className="hidden sm:block" /> 인재를 검토합니다.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">
          직접 작성하거나 AI로 초안을 만든 뒤 추천 인재를 확인하고, 기존 공고의 지원자 전형도 함께 관리합니다.
        </p>
      </header>

      <div className="mt-6 max-w-2xl"><SyntheticNotice /></div>
      <EmployerWorkspace />

      <footer className="mt-16 border-t border-hairline pt-6 text-xs leading-relaxed text-faint">
        회사·공고·지원자·추천 인재는 모두 가상 데이터입니다. 공고 초안과 상태 변경은 현재 세션에만 적용되며 서버나 DB에 저장되지 않습니다.
      </footer>
    </main>
  );
}
