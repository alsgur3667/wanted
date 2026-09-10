'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, BriefcaseBusiness, UsersRound, ClipboardCheck } from 'lucide-react';
import {
  DEMO_ACCOUNTS,
  isRole,
  ROLES,
  signIn,
  verifyDemoCredentials,
  type Role,
} from '@/lib/demo-auth';
import CareerMap from './CareerMap';
import NaviMark from './NaviMark';

// ============================================================================
//  데모 로그인 화면
//
//  ⚠️ 이것은 인증이 아니다. 계정이 코드에 박혀 있고 브라우저에서 대조한다.
//     자세한 이유와 한계는 lib/demo-auth.ts 맨 위에 적어 두었다.
//
//  그래서 이 화면이 반드시 해야 하는 일이 하나 더 있다 — 데모라고 말하는 것.
//  로그인 폼처럼 생긴 것을 보여 주면 사람은 그것을 진짜라고 읽는다.
//  심사위원이 구현하지 않은 것을 구현한 걸로 오해하게 두면 그건 감점이 아니라
//  신뢰 문제라, 안내를 흐린 회색 각주가 아니라 폼 바로 위에 둔다.
//
//  칸은 미리 채워 둔다. 시연에서 아이디를 타이핑하는 20초는 아무것도 설명하지
//  않는다. 대신 지울 수 있게 두어 '틀린 값을 넣으면 어떻게 되는지'도 보인다.
// ============================================================================

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initial: Role = isRole(params.get('role')) ? (params.get('role') as Role) : 'personal';

  const [role, setRole] = useState<Role>(initial);
  const [email, setEmail] = useState(DEMO_ACCOUNTS[initial].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[initial].password);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const account = DEMO_ACCOUNTS[role];

  function switchRole(next: Role) {
    setRole(next);
    setEmail(DEMO_ACCOUNTS[next].email);
    setPassword(DEMO_ACCOUNTS[next].password);
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!verifyDemoCredentials(role, email, password)) {
      setError('데모 계정과 다릅니다. 아래 안내의 계정을 그대로 넣어주세요.');
      return;
    }

    // 잠깐 멈춘다. 즉시 넘어가면 눌렀는지 아닌지 알 수 없다.
    setPending(true);
    signIn(role);
    window.dispatchEvent(new Event('navi-session-change'));
    setTimeout(() => router.push(account.next), 420);
  }

  return (
    <main id="main-content" className="grid min-h-[calc(100svh-72px)] lg:grid-cols-[1fr_520px]">
      {/* ── 왼쪽: 지도 ──
          로그인 화면은 대개 비어 있다. 그 자리에 우리가 뭘 하는 곳인지 둔다.
          큰 화면에서만 보인다 — 좁은 화면에서 이걸 위에 얹으면 폼이 접혀 내려간다. */}
      <div className="relative hidden overflow-hidden border-r border-hairline bg-canvas lg:block">
        <div className="absolute inset-0 flex items-center justify-center p-10">
          {role === 'personal' ? <CareerMap className="w-full max-w-[720px]" /> : <div className="w-full max-w-md space-y-4">{[
            { icon: BriefcaseBusiness, title: '채용 기준을 구체적으로', text: '공고에 필요한 역할과 역량을 정리합니다.' },
            { icon: UsersRound, title: '경험과 역량으로 인재 탐색', text: '공고와 연결되는 인재의 역량 근거를 확인합니다.' },
            { icon: ClipboardCheck, title: '검토부터 다음 전형까지', text: '지원자별 검토 내용과 전형 상태를 관리합니다.' },
          ].map(({icon: Icon, title, text}, i) => <div key={title} className="flex items-center gap-4 rounded-2xl border border-hairline bg-elevated p-6"><Icon className="size-6 shrink-0 text-link" /><div><p className="text-xs text-mute">0{i+1}</p><h2 className="mt-1 font-semibold text-ink">{title}</h2><p className="mt-2 text-xs leading-6 text-body">{text}</p></div></div>)}</div>}
        </div>
        <div className="absolute bottom-10 left-10 right-10">
          <p className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.04em] text-ink">
            <NaviMark className="size-[26px] shrink-0" />
            Career <span className="text-link">Navi</span>
          </p>
          <p className="mt-2 max-w-md text-[14px] leading-[1.7] text-body">
            {role === 'personal' ? '당신의 경험이 이어질 다음 가능성을 찾아보세요.' : '우리 팀에 필요한 역량을 가진 인재를 찾아보세요.'}
          </p>
        </div>
      </div>

      {/* ── 오른쪽: 폼 ── */}
      <div className="flex flex-col justify-center px-6 py-14 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="text-[12px] text-faint transition-colors hover:text-ink">
            ← 처음으로
          </Link>

          <p className="eyebrow mt-6">{role === 'personal' ? '개인 · 커리어 탐색' : '기업 · 채용 워크스페이스'}</p>
          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.035em] text-ink">{role === 'personal' ? '다음 커리어를 찾아보세요.' : '팀의 다음 인재를 만나보세요.'}</h1>
          <p className="mt-2 text-[13px] leading-[1.6] text-body">{account.blurb}</p>

          {/* 역할 전환 — 탭 하나로 계정까지 같이 바뀐다 */}
          <div
            aria-label="로그인 유형"
            className="mt-7 flex rounded-lg border border-hairline bg-canvas p-1"
          >
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => switchRole(r)}
                className={`flex-1 rounded-md px-4 py-2 text-[13px] transition-colors ${
                  role === r ? 'bg-ink font-medium text-elevated' : 'text-mute hover:text-ink'
                }`}
              >
                {DEMO_ACCOUNTS[r].label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6">
            <label htmlFor="email" className="text-[12px] font-medium text-body">
              아이디
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-hairline bg-elevated px-3.5 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-link"
            />

            <label htmlFor="password" className="mt-4 block text-[12px] font-medium text-body">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-hairline bg-elevated px-3.5 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-link"
            />

            {error && <p role="alert" className="mt-3 text-[12px] text-error">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-[14px] font-semibold text-elevated transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  들어가는 중
                </>
              ) : (
                <>
                  {account.label}으로 로그인
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>
          </form>

          {/* ⚠️ 이 안내를 지우지 말 것. 이 화면이 진짜 인증으로 읽히면 안 된다. */}
          <div className="mt-6 rounded-md border border-hairline bg-hairline-soft px-4 py-3">
            <p className="text-[12px] leading-[1.7] text-mute">
              <strong className="font-medium text-warning">데모 로그인</strong> · 실제 인증이 아니며
              회원가입도 없습니다. 위 칸에 데모 계정이 이미 들어 있으니 버튼만 누르면 됩니다.
            </p>
            <p className="mt-2 font-mono text-[11px] leading-[1.7] text-faint">
              {account.email} / {account.password}
            </p>
          </div>

          <p className="mt-4 text-[11px] leading-[1.6] text-faint">
            비밀번호는 서버로 전송되지 않고 브라우저 안에서만 비교합니다. 이 화면 뒤의 회사·공고·지원자는
            모두 가상 데이터입니다.
          </p>
        </div>
      </div>
    </main>
  );
}
