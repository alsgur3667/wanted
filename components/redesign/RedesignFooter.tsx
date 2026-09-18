// ============================================================================
//  RedesignFooter.tsx — Career Navi · 2026-09-17
//  하단 CTA 밴드(노을 사진 + 한 문장 + 흰 버튼)와 랜딩형 푸터.
//  가상 데이터 고지는 이 자리 한 곳에만 둔다.
// ============================================================================

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import NaviMark from '@/components/NaviMark';

export function CtaBand({ title, action, href }: { title: string; action: string; href: string }) {
  return (
    <section className="cta-band" style={{ backgroundImage: 'url(/redesign/cta-sunset.jpg)' }}>
      <div className="wrap">
        <div>
          <span className="overline">Career Navi</span>
          <h2 className="hd">{title}</h2>
        </div>
        <Link href={href} className="btn btn-white">{action} <ArrowRight size={16} aria-hidden /></Link>
      </div>
    </section>
  );
}

export default function RedesignFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="top">
          <Link href="/" className="brand"><NaviMark className="size-[22px]" />Career Navi</Link>
          <nav aria-label="하단 메뉴">
            <Link href="/login?role=personal">개인 서비스</Link>
            <Link href="/login?role=employer">기업 서비스</Link>
            <Link href="/companies">회사·공고 둘러보기</Link>
          </nav>
        </div>
        <p>회사·공고·지원자는 서비스 체험을 위한 가상 데이터이며, 실제 채용으로 연결되지 않습니다.</p>
        <p className="credit">Career Navi · 원티드 AI Championship 2026</p>
      </div>
    </footer>
  );
}
