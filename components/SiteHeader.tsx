'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, currentRole, signOut, type Role } from '@/lib/demo-auth';
import ThemeToggle from './ThemeToggle';
import NaviMark from './NaviMark';

// ============================================================================
//  상단 바
//
//  기업용 서비스의 첫인상은 히어로가 아니라 이 줄에서 결정된다.
//  로고가 왼쪽에 고정돼 있고, 오른쪽 끝에 계정이 있고, 스크롤해도 따라온다 —
//  그 형태만으로 '제품'으로 읽힌다.
//
//  ⚠️ 로그인 상태는 sessionStorage 에 있어서 서버는 모른다. 서버가 그린 것과
//     다르면 하이드레이션 경고가 나므로, 마운트 전에는 아무것도 그리지 않고
//     자리만 잡아 둔다. 그래야 버튼이 나중에 나타나도 줄이 밀리지 않는다.
// ============================================================================

export default function SiteHeader() {
  const [role, setRole] = useState<Role | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 페이지가 바뀔 때마다 다시 읽는다 — 로그인 직후에도 바로 반영된다
  useEffect(() => {
    setRole(currentRole());
    setMounted(true);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2">
          <NaviMark />
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-ink">
            커리어 <span className="text-link">내비</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {/* 마운트 전에는 폭만 잡아 둔다 */}
          {!mounted ? (
            <div className="h-8 w-[76px]" />
          ) : role ? (
            <>
              <span className="hidden px-2 text-[12px] text-mute sm:inline">
                {DEMO_ACCOUNTS[role].displayName}
              </span>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setRole(null);
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

