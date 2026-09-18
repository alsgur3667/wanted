// ============================================================================
//  데모 로그인
//
//  이 화면만 리디자인(v2)을 쓰지 않고 이전 구현을 그대로 둔다.
//
//  v2 로그인은 좌측에 산길 사진을 깔고 CareerMapV2 를 얹는데, 그 지도는 고정된
//  목적지를 한 번 그리고 멈춘다. 여기 LoginJourney 는 8초마다 위치와 직무를 새로
//  뽑아 다시 그리고, 겹침을 피하는 배치·일시정지·동작 줄이기까지 함께 가지고 있다.
//  로그인은 서비스가 무엇을 하는지 처음 보여주는 자리라 그 움직임이 설명을 한다.
//  팀원의 v5 인수인계 문서도 로그인은 이 컴포넌트를 쓰라고 적고 있다.
//
//  ⚠️ 여기에는 .navi-v2 래퍼가 없다. 그래서 layout.tsx 의 SiteHeader(제품 상단 바)가
//     그대로 보인다 — 다른 화면은 RedesignHeader 를 직접 그리고 이 바를 숨긴다.
// ============================================================================

import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import './login.css';

// useSearchParams 를 쓰는 컴포넌트는 Suspense 로 감싸야 한다.
// 감싸지 않으면 이 페이지 전체가 정적 생성에서 빠진다.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <LoginForm />
    </Suspense>
  );
}
