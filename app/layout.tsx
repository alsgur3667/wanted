import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '커리어 내비 — 당신의 다음 커리어를, 데이터로',
  description: '이력서를 넣으면 갈 수 있는 커리어 경로 3개를 안내합니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
