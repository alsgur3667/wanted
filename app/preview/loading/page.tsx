import type { Metadata } from 'next';
import LoadingPreview from './LoadingPreview';

export const metadata: Metadata = {
  title: '분석 로딩 미리보기 | Career Navi',
  robots: { index: false, follow: false },
};

export default function LoadingPreviewPage() {
  return <LoadingPreview />;
}
