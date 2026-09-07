import { ImageResponse } from 'next/og';
import { loadKoreanFont } from '@/lib/og-font';
import { JOB_REQUIREMENTS } from '@/data/job-requirements';
import { CANDIDATES } from '@/data/candidates';
import { buildEmployerResult, isSameRoleTitle } from '@/lib/matching';

export const runtime = 'nodejs';
export const maxDuration = 30;

const AMBER = '#f5a524';
const BG = '#0a0a0a';

// 서비스 소개용 카드. 유저가 공유하는 게 아니라 우리가 커뮤니티·발표에 쓴다.
// 그래서 입력을 받지 않고 서버에서 직접 계산한다 — 숫자가 항상 실제 로직과 일치한다.
export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get('job') ?? 'jr_pm';
  const req_ = JOB_REQUIREMENTS.find((j) => j.id === jobId) ?? JOB_REQUIREMENTS[0];

  const all = buildEmployerResult(req_, CANDIDATES, { includeDifferentRole: true });
  const same = buildEmployerResult(req_, CANDIDATES, { includeDifferentRole: false });
  const missed = all.matches.filter((m) => !isSameRoleTitle(req_, m.candidate)).slice(0, 2);

  const text =
    `커리어 내비 채용 중 직무명으로 검색 역량으로 검색 명 놓치고 있던 적합도 ` +
    `직무명이 아니라 역량으로 연결합니다 원티드 AI Championship 2026 ${req_.title}` +
    missed.map((m) => m.candidate.currentJobTitle).join('');

  const [bold, regular] = await Promise.all([loadKoreanFont(text, 700), loadKoreanFont(text, 400)]);

  const Num = ({ n, label, dim }: { n: number; label: string; dim?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', color: dim ? '#5a5a5a' : AMBER }}>
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, lineHeight: 1 }}>{n}</div>
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, marginLeft: 6 }}>명</div>
      </div>
      <div style={{ display: 'flex', fontSize: 24, color: '#8a8a8a', marginTop: 14, fontWeight: 400 }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: BG, color: '#ededed', padding: '64px 72px', fontFamily: 'Noto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#8a8a8a', fontWeight: 400 }}>커리어 내비</div>
          <div style={{ display: 'flex', fontSize: 30, color: '#d4d4d4', fontWeight: 700 }}>
            {req_.title} 채용 중
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 56 }}>
          <Num n={same.matches.length} label="직무명으로 검색" dim />
          {/* 화살표는 글자(→) 대신 SVG 로 그린다. 폰트에 글리프가 없으면 □ 로 깨진다 */}
          <div style={{ display: 'flex', paddingBottom: 34 }}>
            <svg width="72" height="30" viewBox="0 0 72 30">
              <path d="M2 15 H56 M46 5 L60 15 L46 25"
                stroke="#5a5a5a" strokeWidth="4" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <Num n={all.matches.length} label="역량으로 검색" />

          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24, gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 24, color: AMBER, fontWeight: 700 }}>
              놓치고 있던 {missed.length}명
            </div>
            {missed.map((m) => (
              <div key={m.candidate.id} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'rgba(245,165,36,0.09)', borderRadius: 12,
                padding: '14px 20px' }}>
                <div style={{ display: 'flex', fontSize: 27, color: '#e8e8e8' }}>
                  {m.candidate.currentJobTitle}
                </div>
                <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: AMBER }}>
                  {m.fitScore}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 26 }}>
          <div style={{ display: 'flex', fontSize: 29, color: '#d4d4d4', fontWeight: 700 }}>
            직무명이 아니라 역량으로 연결합니다
          </div>
          <div style={{ display: 'flex', fontSize: 21, color: '#6a6a6a', fontWeight: 400 }}>
            원티드 AI Championship 2026
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630,
      fonts: [
        { name: 'Noto', data: bold, weight: 700, style: 'normal' },
        { name: 'Noto', data: regular, weight: 400, style: 'normal' },
      ] }
  );
}
