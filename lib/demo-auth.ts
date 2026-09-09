// ============================================================================
//  데모 로그인 — 실제 인증이 아니다.
//
//  ⚠️ 아래 계정은 브라우저로 내려가는 코드에 그대로 들어 있다. 개발자도구를 열면
//     누구나 볼 수 있고, 클라이언트에서만 비교하므로 우회도 얼마든지 가능하다.
//     그래서 이것은 '지키는 장치'가 아니라 '흐름을 보여주는 장치'다.
//
//  이 방식을 쓸 수 있는 이유는 뒤에 지킬 것이 없기 때문이다 —
//  회사·공고·지원자가 전부 우리가 만든 가상 데이터이고, 이력서는 사용자의
//  브라우저를 떠나지 않으며, 서버에도 DB에도 아무것도 저장하지 않는다.
//
//  ⚠️ 로그인 뒤에 진짜 개인정보나 실제 채용 데이터가 들어오는 순간
//     이 파일은 통째로 버리고 서버 세션으로 옮겨야 한다.
//
//  화면에도 데모임을 반드시 적는다. 심사위원이 이걸 진짜 인증으로 오해하면
//  구현하지 않은 것을 구현한 척한 셈이 되고, 그건 감점이 아니라 신뢰 문제다.
// ============================================================================

export type Role = 'personal' | 'employer';

export type DemoAccount = {
  role: Role;
  /** 화면에 쓰는 역할 이름 */
  label: string;
  /** 그 역할로 들어가면 보게 되는 것 — 로그인 화면에서 한 줄로 설명한다 */
  blurb: string;
  email: string;
  password: string;
  /** 로그인 뒤 갈 곳 */
  next: string;
  /** 헤더에 띄울 이름 */
  displayName: string;
};

export const DEMO_ACCOUNTS: Record<Role, DemoAccount> = {
  personal: {
    role: 'personal',
    label: '개인',
    blurb: '이력서를 넣고 갈 수 있는 커리어 경로를 봅니다.',
    email: 'demo@career-navi.dev',
    password: 'navi-demo-2026',
    next: '/personal',
    displayName: '데모 사용자',
  },
  employer: {
    role: 'employer',
    label: '기업',
    blurb: '공고를 만들고 역량 근거로 인재를 검토합니다.',
    email: 'hr@career-navi.dev',
    password: 'navi-demo-2026',
    next: '/employer',
    displayName: '가상 채용 담당자',
  },
};

export const ROLES: Role[] = ['personal', 'employer'];

export function isRole(value: string | null | undefined): value is Role {
  return value === 'personal' || value === 'employer';
}

/** 입력값 대조. 다시 말하지만 이것은 보안이 아니라 화면 흐름이다. */
export function verifyDemoCredentials(role: Role, email: string, password: string): boolean {
  const account = DEMO_ACCOUNTS[role];
  return email.trim().toLowerCase() === account.email && password === account.password;
}

// ── 세션 ────────────────────────────────────────────────────────────────
//  sessionStorage 를 쓴다. 탭을 닫으면 사라지는 게 데모에 맞고,
//  공용 컴퓨터에서 시연할 때 흔적이 남지 않는다.

const SESSION_KEY = 'navi.demo-session';

export function signIn(role: Role): void {
  try {
    sessionStorage.setItem(SESSION_KEY, role);
  } catch {
    /* 저장이 막힌 환경 — 로그인 상태만 못 기억할 뿐 화면은 그대로 동작한다 */
  }
}

export function signOut(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* 위와 같다 */
  }
}

export function currentRole(): Role | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return isRole(raw) ? raw : null;
  } catch {
    return null;
  }
}
