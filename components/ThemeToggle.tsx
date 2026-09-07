'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// ============================================================================
//  라이트/다크 전환
//
//  shadcn 은 다크를 `.dark` 클래스로 판정한다(@custom-variant dark).
//  그래서 클래스를 붙이는 쪽이 따로 필요하다.
//
//  기본값은 시스템 설정을 따르고, 사용자가 한 번 고르면 그 선택을 기억한다.
//  첫 페인트 전에 클래스를 붙이는 일은 layout.tsx 의 인라인 스크립트가 한다 —
//  여기서 하면 흰 화면이 한 번 번쩍인다.
// ============================================================================

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* 저장이 막힌 환경 — 이번 세션에만 적용된다 */
    }
    setTheme(next);
  }

  // 마운트 전에는 아이콘을 정하지 않는다. 서버가 그린 것과 어긋나면 경고가 난다.
  const label = theme === 'dark' ? '라이트 모드로' : '다크 모드로';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-lg border border-black/10 text-black/55 transition hover:text-black dark:border-white/15 dark:text-white/55 dark:hover:text-white"
    >
      {theme === null ? (
        <span className="size-4" />
      ) : theme === 'dark' ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
