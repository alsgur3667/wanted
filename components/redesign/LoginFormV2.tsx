'use client';

// ============================================================================
//  LoginFormV2.tsx — Career Navi · 2026-09-17
//  데모 로그인 화면. 인증 아님·계정 미리 채움·데모 안내 — LoginForm 의 규칙을
//  그대로 지킨다(lib/demo-auth.ts 상단 참고). 구성만 바꿨다:
//  좌측 산길 사진 위 스토리 + CareerMapV2, 우측 카드 폼.
//  미리보기에서는 로그인 후 /preview/...-v2 로 보낸다(nextOverride).
// ============================================================================

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { DEMO_ACCOUNTS, isRole, ROLES, signIn, verifyDemoCredentials, type Role } from '@/lib/demo-auth';
import LoginJourney from '@/components/LoginJourney';

const STEPS: Record<Role, [string, string][]> = {
  personal: [['경험 정리', '이력서에서 나의 역량을 발견해요.'], ['경로 탐색', '연결되는 직무와 이유를 살펴봐요.'], ['다음 단계', '부족한 역량과 준비 방향을 확인해요.']],
  employer: [['채용 조건 정리', '우리 팀에 필요한 역량을 정의해요.'], ['후보자 탐색', '직무를 넘어 연결되는 경험을 찾아요.'], ['근거 확인', '적합한 이유와 역량 차이를 비교해요.']],
};

export default function LoginFormV2({ nextOverride }: { nextOverride?: Partial<Record<Role, string>> }) {
  const router = useRouter();
  const params = useSearchParams();
  const initial: Role = isRole(params.get('role')) ? (params.get('role') as Role) : 'personal';
  const [role, setRole] = useState<Role>(initial);
  const [email, setEmail] = useState(DEMO_ACCOUNTS[initial].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[initial].password);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const account = DEMO_ACCOUNTS[role];
  const personal = role === 'personal';

  function switchRole(next: Role) {
    setRole(next); setEmail(DEMO_ACCOUNTS[next].email); setPassword(DEMO_ACCOUNTS[next].password); setError(null);
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!verifyDemoCredentials(role, email, password)) {
      setError('데모 계정과 다릅니다. 아래 안내의 계정을 그대로 넣어주세요.');
      return;
    }
    setPending(true);
    signIn(role);
    setTimeout(() => router.push(nextOverride?.[role] ?? account.next), 420);
  }

  return (
    <div className="login-v2">
      <section className="login-story" aria-label={personal ? '개인 서비스 안내' : '기업 서비스 안내'}>
        <Image src="/redesign/hero-path-wide.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 60vw" className="login-photo" priority />
        <div className="login-story-in">
          <span className="overline">{personal ? 'For your next chapter' : 'For your next team'}</span>
          <h2 className="hd">{personal ? <>쌓아온 경험이,<br />새로운 길의 시작이 되도록.</> : <>직무명보다 깊이,<br />우리 팀에 맞는 역량을.</>}</h2>
          <p className="login-copy">{personal ? '이력서 속 강점부터 미처 생각하지 못한 직무까지. 나의 경험으로 이어지는 다음 커리어를 살펴보세요.' : '채용 조건을 역량으로 정리하고, 다양한 경험을 가진 후보자가 우리 팀과 어떻게 연결되는지 살펴보세요.'}</p>
          {/* ⚠️ CareerMapV2 로 되돌리지 말 것.
              CareerMapV2 는 고정된 목적지를 한 번 그리고 멈춘다. 기존 LoginJourney 는
              8초마다 위치와 직무를 새로 뽑아 다시 그리고, 겹침을 피하는 배치와
              일시정지 버튼, 동작 줄이기 설정까지 함께 가지고 있다.
              v5 인수인계 문서도 로그인은 이 컴포넌트를 쓰라고 못박고 있다. */}
          <div className="login-map">
            <LoginJourney role={role} />
          </div>
          <ol className="login-steps">
            {STEPS[role].map(([title, desc], i) => (
              <li key={title}><span className="num">0{i + 1}</span><div><h3>{title}</h3><p>{desc}</p></div></li>
            ))}
          </ol>
        </div>
      </section>

      <div className="login-side">
        <div className="login-card">
          <Link href="/" className="login-back"><ArrowLeft size={14} aria-hidden /> 처음으로</Link>
          <h1 className="hd">{personal ? '나의 다음 커리어 찾기' : '우리 팀의 인재 찾기'}</h1>
          <p className="login-blurb">{account.blurb}</p>

          <div className="tabs" role="group" aria-label="로그인 유형">
            {ROLES.map((r) => (
              <button key={r} type="button" aria-pressed={role === r} disabled={pending} onClick={() => switchRole(r)}>{DEMO_ACCOUNTS[r].label}</button>
            ))}
          </div>

          <form onSubmit={submit} className="login-form">
            <label htmlFor="email-v2">아이디</label>
            <input id="email-v2" name="email" type="email" required aria-invalid={!!error} aria-describedby={error ? 'login-error-v2' : undefined} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="password-v2">비밀번호</label>
            <input id="password-v2" name="password" type="password" required aria-invalid={!!error} aria-describedby={error ? 'login-error-v2' : undefined} autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p id="login-error-v2" role="alert" className="error">{error}</p>}
            <button type="submit" disabled={pending} className="btn btn-dark">
              {pending ? <><Loader2 size={16} className="animate-spin" aria-hidden />들어가는 중</> : <>{account.label}으로 로그인 <ArrowRight size={16} aria-hidden /></>}
            </button>
          </form>

          {/* ⚠️ 이 안내를 지우지 말 것. 이 화면이 진짜 인증으로 읽히면 안 된다. */}
          <div className="login-demo">
            <p><strong>데모 로그인</strong> · 실제 인증이 아니며 회원가입도 없습니다. 위 칸에 데모 계정이 이미 들어 있으니 버튼만 누르면 됩니다.</p>
            <code>{account.email} / {account.password}</code>
          </div>
          <p className="login-fine">비밀번호는 서버로 전송되지 않고 브라우저 안에서만 비교합니다. 이 화면 뒤의 회사·공고·지원자는 모두 가상 데이터입니다.</p>
        </div>
      </div>
    </div>
  );
}
