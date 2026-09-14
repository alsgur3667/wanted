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
//  ⚠️ 이 서비스는 라이트 모드 전용이다.
//
//  랜딩 히어로가 사진 위에 흰 글씨를 얹는 구조라 다크에서 대비가 무너지고,
//  landing.css 가 이미 토큰을 라이트 값으로 고정하고 있었다. 화면마다 톤이
//  갈리느니 하나로 맞추는 편이 낫다고 판단해 토글을 걷어냈다.
//
//  다크는 `.dark` 클래스 하나로만 켜진다(globals.css 의 @custom-variant).
//  그 클래스를 아무도 붙이지 않으므로 코드에 남아 있는 `dark:` 클래스와
//  `.dark { }` 블록은 전부 작동하지 않는다. 되살리려면 여기서 클래스를
//  붙이는 스크립트를 되돌리면 되고, CSS 는 건드리지 않아도 된다.
// ============================================================================

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cn('font-sans', geist.variable)}>
      <body className="antialiased">
        {/* 휠 스크롤을 매끄럽게 만든다. 스크롤에 물린 애니메이션도 같이 부드러워진다 */}
        <SmoothScroll />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
