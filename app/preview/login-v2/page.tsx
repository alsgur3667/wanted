// ============================================================================
//  app/preview/login-v2/page.tsx — Career Navi · 2026-09-17
//  /login 리디자인 미리보기. 로그인 후 /preview/personal-v2 · /preview/employer-v2 로 간다.
// ============================================================================

import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginFormV2 from '@/components/redesign/LoginFormV2';
import RedesignHeader from '@/components/redesign/RedesignHeader';
import '@/app/redesign.css';
import './login-v2.css';

export const metadata: Metadata = {
  title: '로그인 (리디자인 미리보기) | Career Navi',
  robots: { index: false, follow: false },
};

export default function LoginV2Page() {
  return (
    <div className="navi-v2">
      <RedesignHeader />
      <main className="v2-main">
        <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
          <LoginFormV2 nextOverride={{ personal: '/preview/personal-v2', employer: '/preview/employer-v2' }} />
        </Suspense>
      </main>
    </div>
  );
}
