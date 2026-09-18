'use client';

// ============================================================================
//  RedesignHeader.tsx — Career Navi · 2026-09-17
//  리디자인 1차 상단 바. 랜딩 LandingHeader 와 같은 구성(NaviMark 로고, 내비 4개,
//  연한 민트 버튼)을 제품 화면에도 쓴다. 로그인 상태 처리는 SiteHeader 와 같다.
//  정식 반영 시 SiteHeader 의 제품 분기를 이 컴포넌트로 교체한다.
// ============================================================================

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, currentRole, signOut } from '@/lib/demo-auth';
import NaviMark from '@/components/NaviMark';

const subscribe = () => () => {};
const serverRole = () => null;

export default function RedesignHeader({ active }: { active?: 'personal' | 'employer' | 'companies' }) {
  const role = useSyncExternalStore(subscribe, currentRole, serverRole);
  const router = useRouter();

  return (
    <header className="site-header">
      <div className="in">
        <Link href="/" className="brand" aria-label="Career Navi 홈">
          <NaviMark className="size-7" />
          <span>Career <b>Navi</b></span>
        </Link>
        {/* 제품 화면에서는 '개인·기업 서비스'가 소개가 아니라 입구다.
            랜딩 앵커로 보내면 이미 들어온 사람을 다시 소개 글로 내보내는 셈이라,
            바로 그 역할의 로그인으로 보낸다. 랜딩 헤더는 소개가 목적이므로 앵커 그대로 둔다. */}
        <nav className="site-nav" aria-label="서비스 안내">
          <Link href="/login?role=personal" className={active === 'personal' ? 'on' : undefined}>개인 서비스</Link>
          <Link href="/login?role=employer" className={active === 'employer' ? 'on' : undefined}>기업 서비스</Link>
          <Link href="/#evidence">추천의 근거</Link>
          <Link href="/companies" className={active === 'companies' ? 'on' : undefined}>회사·공고</Link>
        </nav>
        <div className="hdr-right">
          {role ? (
            <>
              <span>{DEMO_ACCOUNTS[role].displayName}</span>
              <button
                type="button"
                className="btn btn-login"
                onClick={() => {
                  signOut();
                  router.push('/');
                }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-login">데모 시작하기</Link>
          )}
        </div>
      </div>
    </header>
  );
}
