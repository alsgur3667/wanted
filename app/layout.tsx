import type { Metadata } from 'next';
import './globals.css';
import './product.css';
import 'lenis/dist/lenis.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import SiteHeader from '@/components/SiteHeader';
import SmoothScroll from '@/components/SmoothScroll';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Career Navi — 당신의 다음 커리어를, 데이터로',
  description: '이력서를 넣으면 갈 수 있는 커리어 경로 3개를 안내합니다.',
};

// ============================================================================
//  다크 판정을 첫 페인트 전에 끝낸다.
//
//  shadcn init 이 `@custom-variant dark (&:is(.dark *))` 로 바꿔 놓아서,
//  html 에 .dark 가 없으면 컴포넌트의 dark: 클래스가 전부 죽는다.
//  그 클래스를 React 가 마운트된 뒤에 붙이면 흰 화면이 한 번 번쩍인다.
//  그래서 head 안에서 동기 스크립트로 먼저 판정한다.
//
//  저장된 선택이 있으면 그것을, 없으면 시스템 설정을 따른다.
// ============================================================================
const THEME_INIT = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="antialiased">
        {/* 휠 스크롤을 매끄럽게 만든다. 스크롤에 물린 애니메이션도 같이 부드러워진다 */}
        <SmoothScroll />
        {/* 테마 토글은 헤더 안으로 들어갔다. 화면 구석에 떠 있으면
            어느 화면에서도 소속이 없어 보이고, 로그인 버튼과 나란히 두면
            둘 다 '내 계정 쪽 도구'로 읽힌다. */}
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
