import './employer.css';
import EmployerWorkspace from '@/components/EmployerWorkspace';
import SyntheticNotice from '@/components/SyntheticNotice';

export default function EmployerPage() {
  return (
    <main className="employer-page">
      <header className="employer-header"><div><h1>채용 관리</h1><p>지원 현황을 확인하고, 경험과 역량을 바탕으로 검토하세요.</p></div><div><SyntheticNotice compact /></div></header>
      <EmployerWorkspace />

      <footer className="mt-16 border-t border-hairline pt-6 text-[11px] leading-[1.6] text-faint">
        회사·공고·지원자·추천 인재는 모두 가상 데이터입니다. 공고 초안과 상태 변경은 현재 세션에만 적용되며 서버나 DB에 저장되지 않습니다.
      </footer>
    </main>
  );
}
