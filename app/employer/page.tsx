// ============================================================================
//  기업 · 채용 관리
//  화면은 리디자인(v2)을 정식 채택했다. 공고 초안과 전형 상태는 화면 상태로만 남고
//  서버나 DB에 저장하지 않는다.
// ============================================================================

import type { Metadata } from 'next';
import EmployerWorkspaceV2 from '@/components/redesign/EmployerWorkspaceV2';
import RedesignHeader from '@/components/redesign/RedesignHeader';
import RedesignFooter from '@/components/redesign/RedesignFooter';
import '@/app/redesign.css';
import '@/app/preview/employer-v2/employer-v2.css';

export const metadata: Metadata = {
  title: '채용 관리 | Career Navi',
};

export default function EmployerPage() {
  return (
    <div className="navi-v2 employer-v2">
      <RedesignHeader active="employer" />
      <main className="v2-main">
        <div className="wrap">
          <header className="emp-head rv">
            <div>
              <span className="overline">For your next team</span>
              <h1 className="hd">채용 관리</h1>
              <p>지원 현황을 확인하고, 경험과 역량을 바탕으로 검토하세요.</p>
            </div>
            <p className="synthetic"><strong>가상 기업·데모 공고</strong> · 회사·공고·지원자·추천 인재는 모두 가상 데이터입니다.</p>
          </header>
          <EmployerWorkspaceV2 />
          <p className="emp-foot">공고 초안과 상태 변경은 현재 세션에만 적용되며 서버나 DB에 저장되지 않습니다.</p>
        </div>
      </main>
      <RedesignFooter />
    </div>
  );
}
