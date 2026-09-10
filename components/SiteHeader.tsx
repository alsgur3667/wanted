'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, currentRole, signOut } from '@/lib/demo-auth';
import ThemeToggle from './ThemeToggle';
import NaviMark from './NaviMark';

// ============================================================================
//  상단 바
//
//  기업용 서비스의 첫인상은 히어로가 아니라 이 줄에서 결정된다.
//  로고가 왼쪽에 고정돼 있고, 오른쪽 끝에 계정이 있고, 스크롤해도 따라온다 —
//  그 형태만으로 '제품'으로 읽힌다.
//
//  서버에서는 비로그인 상태를 렌더링하고, 클라이언트에서는 세션 변경을 구독한다.
// ============================================================================

function subscribe(listener: () => void) {
  window.addEventListener('navi-session-change', listener);
  return () => window.removeEventListener('navi-session-change', listener);
}
const serverRole = () => null;

export default function SiteHeader() {
  const role = useSyncExternalStore(subscribe, currentRole, serverRole);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur">
      {/* ⚠️ 폭·여백을 랜딩 히어로(app/page.tsx)와 같은 값으로 맞춘다.
             다르면 헤더 로고와 h1 의 왼쪽 선이 어긋나 보인다. */}
      <div className="site-container flex min-h-18 flex-wrap items-center justify-between gap-x-4">
        <Link href="/" className="flex items-center gap-2">
          <NaviMark />
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-ink">
            Career <span className="text-link">Navi</span>
          </span>
        </Link>

        <nav aria-label="주요 메뉴" className="order-3 flex w-full border-t border-hairline pb-2 pt-1 sm:order-none sm:w-auto sm:border-0 sm:p-0">
          {[
            { href: '/personal', label: '개인 · 커리어 탐색' },
            { href: '/companies', label: '회사·공고' },
            { href: '/employer', label: '기업 · 채용 관리' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined} className="nav-link">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 py-3">
          <ThemeToggle />

          {role ? (
            <>
              <span className="hidden px-2 text-[12px] text-mute sm:inline">
                {DEMO_ACCOUNTS[role].displayName}
              </span>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  window.dispatchEvent(new Event('navi-session-change'));
                  router.push('/');
                }}
                className="rounded-md border border-hairline px-3 py-1.5 text-[12px] text-body transition-colors hover:border-link/50 hover:text-ink"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-ink px-3.5 py-1.5 text-[12px] font-medium text-elevated transition-opacity hover:opacity-85"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

