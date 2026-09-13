'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, currentRole, signOut } from '@/lib/demo-auth';
import ThemeToggle from './ThemeToggle';
import NaviMark from './NaviMark';
import LandingHeader from './LandingHeader';

// ============================================================================
//  상단 바
//
//  기업용 서비스의 첫인상은 히어로가 아니라 이 줄에서 결정된다.
//  로고가 왼쪽에 고정돼 있고, 오른쪽 끝에 계정이 있고, 스크롤해도 따라온다 —
//  그 형태만으로 '제품'으로 읽힌다.
//
//  서버는 비로그인 상태로 렌더링하고 클라이언트에서 세션 스냅샷을 읽는다.
//  usePathname이 페이지 이동 시 다시 렌더링하므로 로그인 직후에도 갱신된다.
// ============================================================================

const subscribe = () => () => {};
const serverRole = () => null;

export default function SiteHeader() {
  const role = useSyncExternalStore(subscribe, currentRole, serverRole);
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/') return <LandingHeader />;

  return (
    <header className="product-header sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur">
      {/* ⚠️ 폭·여백을 랜딩 히어로(app/page.tsx)와 같은 값으로 맞춘다.
             다르면 헤더 로고와 h1 의 왼쪽 선이 어긋나 보인다. */}
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-14">
        <Link href="/" className="product-brand flex items-center gap-[9px]">
          <NaviMark className="size-7" />
          <span className="text-[20px] font-bold tracking-[-0.04em] text-ink">
            Career <b className="text-[#087f70] dark:text-link">Navi</b>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {role ? (
            <>
              <span className="hidden px-2 text-[14px] text-mute sm:inline">
                {DEMO_ACCOUNTS[role].displayName}
              </span>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  router.push('/');
                }}
                className="rounded-md border border-hairline px-3 py-1.5 text-[14px] text-body transition-colors hover:border-link/50 hover:text-ink"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-ink px-3.5 py-1.5 text-[14px] font-medium text-elevated transition-opacity hover:opacity-85"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

