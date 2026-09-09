import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';

// useSearchParams 를 쓰는 컴포넌트는 Suspense 로 감싸야 한다.
// 감싸지 않으면 이 페이지 전체가 정적 생성에서 빠진다.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <LoginForm />
    </Suspense>
  );
}
