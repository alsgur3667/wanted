// ============================================================================
//  app/preview/companies-v2/page.tsx — Career Navi · 2026-09-17
//  /companies 리디자인 1차 미리보기. 기존 /companies 는 그대로 둔다.
// ============================================================================

import type { Metadata } from 'next';
import Image from 'next/image';
import { Crosshair, TrendingUp, UsersRound } from 'lucide-react';
import CompanyDirectoryV2 from '@/components/redesign/CompanyDirectoryV2';
import RedesignHeader from '@/components/redesign/RedesignHeader';
import RedesignFooter, { CtaBand } from '@/components/redesign/RedesignFooter';
import '@/app/redesign.css';
import './companies-v2.css';

export const metadata: Metadata = {
  title: '회사·공고 둘러보기 (리디자인 미리보기) | Career Navi',
  robots: { index: false, follow: false },
};

const WHY = [
  { icon: Crosshair, title: '관심사 기반 매칭', text: '당신의 커리어 관심사와 희망하는 분야에 맞는 기업을 추천합니다.' },
  { icon: TrendingUp, title: '성장 가능성 높은 기업', text: '지속적인 성장과 혁신을 추구하는 유망한 기업들만 선별했습니다.' },
  { icon: UsersRound, title: '맞춤형 채용 정보', text: '당신의 역량과 경험에 맞는 채용 공고를 확인할 수 있어요.' },
];

export default function CompaniesV2Page() {
  return (
    <div className="navi-v2 companies-v2">
      <RedesignHeader active="companies" />
      <main className="v2-main">
        <section className="hero">
          <div className="wrap">
            <div className="rv">
              <span className="overline">Find your next company</span>
              <h1 className="hd">함께 성장할 팀을<br />찾아보세요.</h1>
              <p className="lead">당신의 커리어 관심사와 역량에 맞는 기업을 발견하고,<br />지금, 더 나은 성장을 시작해보세요.</p>
            </div>
            <div className="hero-visual rv rv-2">
              <Image src="/redesign/hero-path-wide.jpg" alt="산맥 사이로 난 길 끝에 빛나는 문이 서 있는 풍경" fill priority sizes="(max-width: 1000px) 100vw, 640px" />
            </div>
          </div>
        </section>

        <CompanyDirectoryV2 basePath="/preview/companies-v2" />

        <section className="why">
          <div className="wrap">
            <div className="box rv">
              <div><span className="overline">Why we recommend</span><h2 className="hd">이 기업들을 추천하는 이유</h2></div>
              <div className="items">
                {WHY.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="feat">
                    <span className="ico"><Icon size={22} strokeWidth={1.6} aria-hidden /></span>
                    <div><h4>{title}</h4><p>{text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CtaBand title="지금, 당신의 커리어를 함께할 회사를 찾아보세요." action="나의 커리어에 맞는 기업 찾기" href="/login?role=personal" />
      </main>
      <RedesignFooter />
    </div>
  );
}
