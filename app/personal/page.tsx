'use client';

// ============================================================================
//  개인 · 경험 입력과 결과
//
//  화면은 팀원이 만든 리디자인(v2)을 정식으로 채택했다.
//  구현체는 components/redesign/* 에 있고, 여기서는 조립만 한다.
//  같은 화면을 /preview/personal-v2 에서도 볼 수 있다 — 비교용으로 남겨 둔 경로다.
//
//  ⚠️ 상단 바를 두 개 그리지 않는다. redesign.css 가
//     `body:has(.navi-v2) .product-header { display:none }` 로 기존 헤더를 숨기므로,
//     이 페이지 안의 RedesignHeader 하나만 남는다.
// ============================================================================

import { useState } from 'react';
import Image from 'next/image';
import { BarChart3, Compass, Crosshair, Map, Send, Star } from 'lucide-react';
import type { AnalysisResult } from '@/types';
import ResultViewV2 from '@/components/redesign/ResultViewV2';
import ResumeInputV2 from '@/components/redesign/ResumeInputV2';
import RedesignHeader from '@/components/redesign/RedesignHeader';
import RedesignFooter, { CtaBand } from '@/components/redesign/RedesignFooter';
import '@/app/redesign.css';
import '@/app/preview/personal-v2/personal-v2.css';
import '@/app/preview/personal-v2/result-v2.css';

const FEATURES = [
  { icon: Star, title: '경험 속 나의 강점', text: '지금까지의 경험을 분석해\n나만의 강점과 역량을 발견합니다.' },
  { icon: Send, title: '연결되는 커리어 경로', text: '강점과 역량에 맞는\n직무와 커리어 경로를 제안합니다.' },
  { icon: BarChart3, title: '다음 도전을 위한 준비', text: '지금의 경험을 바탕으로\n더 나은 내일을 준비할 수 있습니다.' },
];

const SERVICES = [
  { icon: Compass, title: '경험 기반 역량 분석', text: '입력한 경험을 바탕으로 핵심 역량을 분석합니다.' },
  { icon: Crosshair, title: '맞춤형 직무 추천', text: '당신의 강점과 경향에 맞는 직무를 제안합니다.' },
  { icon: Map, title: '커리어 로드맵 제공', text: '단기/장기 목표에 맞는 커리어 경로를 안내합니다.' },
];

export default function PersonalPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [searching, setSearching] = useState(false);
  const idle = !result && !searching;

  return (
    <div className="navi-v2 personal-v2">
      <RedesignHeader active="personal" />
      <main className="v2-main">
        {idle && (
          <section className="hero">
            <div className="wrap">
              <div className="rv">
                <span className="overline">Your experience, next career</span>
                <h1 className="hd">쌓아온 경험에서,<br />다음 가능성을 찾아보세요.</h1>
                <p className="lead">이력서나 직접 적은 경험을 바탕으로 강점과 연결되는 직무를 살펴봅니다.<br />직무명보다 어떤 일을 했는지가 중요합니다.</p>
              </div>
              <div className="hero-visual rv rv-2">
                <Image src="/redesign/hero-path.jpg" alt="EXPERIENCE · ANALYSIS · CAREER 카드가 놓인 산길 위로 해가 뜨는 풍경" fill priority sizes="(max-width: 1000px) 100vw, 560px" />
              </div>
            </div>
          </section>
        )}

        {idle && (
          <div className="wrap">
            <ol className="steps rv rv-2" aria-label="커리어 탐색 순서">
              <li aria-current="step"><span className="num">01</span><div><b>경험 입력</b><p>나의 경험을 입력하거나 파일을 업로드하세요.</p></div><i /></li>
              <li><span className="num">02</span><div><b>역량 분석</b><p>입력한 경험을 바탕으로 강점을 분석합니다.</p></div><i /></li>
              <li><span className="num">03</span><div><b>커리어 경로 확인</b><p>나와 연결되는 직무와 커리어 경로를 제안합니다.</p></div></li>
            </ol>
          </div>
        )}

        <section className={result ? 'result-sec' : 'input-sec'}>
          <div className="wrap">
            {result ? (
              <ResultViewV2 result={result} onReset={() => setResult(null)} />
            ) : (
              <ResumeInputV2 onResult={setResult} onSearchingChange={setSearching} />
            )}
          </div>
        </section>

        {idle && (
          <>
            <section className="feat-sec">
              <div className="wrap sec-head">
                <div className="n"><span className="num">02</span><span className="rule" /><h2 className="hd">이런 점이<br />특별해요</h2></div>
                <div className="grid">
                  {FEATURES.map(({ icon: Icon, title, text }, i) => (
                    <div key={title} className={`feat rv rv-${i + 1}`}>
                      <span className="ico"><Icon size={22} strokeWidth={1.6} aria-hidden /></span>
                      <div><h4>{title}</h4><p>{text.split('\n').map((l, j) => <span key={j}>{l}{j === 0 && <br />}</span>)}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="svc-sec">
              <div className="wrap sec-head">
                <div className="n">
                  <span className="num">03</span><span className="rule" />
                  <h2 className="hd">제공 서비스 안내</h2>
                  <p>Career Navi는 당신의 경험을 더 가치 있게 분석하고, 맞춤형 커리어 방향을 제안합니다.</p>
                </div>
                <div className="body">
                  <div className="svc-visual">
                    <Image src="/redesign/service-wave.jpg" alt="데이터 흐름을 나타내는 빛의 리본" fill sizes="(max-width: 1000px) 100vw, 520px" />
                    <span>DATA × AI × CAREER</span>
                  </div>
                  <div className="svc-list">
                    {SERVICES.map(({ icon: Icon, title, text }) => (
                      <div key={title} className="feat">
                        <span className="ico"><Icon size={22} strokeWidth={1.6} aria-hidden /></span>
                        <div><h4>{title}</h4><p>{text}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <CtaBand title="지금, 당신의 다음 가능성을 시작하세요." action="나의 커리어 경로 찾기" href="#experience-title" />
          </>
        )}
      </main>
      <RedesignFooter />
    </div>
  );
}
