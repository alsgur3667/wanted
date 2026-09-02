import type { Skill, Quadrant } from '@/types';

const W = 520;
const H = 460;
const PAD = { l: 58, r: 26, t: 26, b: 52 };

const QUAD_COLOR: Record<Quadrant, string> = {
  leverage: '#f5a524',
  lockin: '#a855f7',
  common: '#64748b',
  noise: '#334155',
};

const QUAD_LABEL: Record<Quadrant, string> = {
  leverage: '피벗 무기',
  lockin: '도메인 락인',
  common: '흔한 역량',
  noise: '노이즈',
};

export default function SkillMap({ skills }: { skills: Skill[] }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (v: number) => PAD.l + v * iw;
  const y = (v: number) => PAD.t + (1 - v) * ih;

  const shown = skills.filter((s) => s.quadrant !== 'noise');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" role="img"
           aria-label="스킬 전이성 지도">
        {/* 사분면 배경 */}
        <rect x={x(0.5)} y={y(1)} width={iw / 2} height={ih / 2}
              fill="#f5a524" opacity="0.07" />

        {/* 축 */}
        <line x1={PAD.l} y1={y(0)} x2={x(1)} y2={y(0)} stroke="currentColor" opacity="0.25" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={y(0)} stroke="currentColor" opacity="0.25" />
        {/* 사분면 구분선 */}
        <line x1={x(0.5)} y1={PAD.t} x2={x(0.5)} y2={y(0)}
              stroke="currentColor" opacity="0.15" strokeDasharray="4 4" />
        <line x1={PAD.l} y1={y(0.5)} x2={x(1)} y2={y(0.5)}
              stroke="currentColor" opacity="0.15" strokeDasharray="4 4" />

        {/* 사분면 라벨 */}
        <text x={x(0.97)} y={y(0.96)} textAnchor="end" fontSize="11"
              fill={QUAD_COLOR.leverage} fontWeight="600">피벗 무기</text>
        <text x={x(0.03)} y={y(0.96)} fontSize="11" fill={QUAD_COLOR.lockin} opacity="0.85">도메인 락인</text>
        <text x={x(0.97)} y={y(0.04)} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.4">흔한 역량</text>

        {/* 축 이름 */}
        <text x={PAD.l + iw / 2} y={H - 14} textAnchor="middle" fontSize="11"
              fill="currentColor" opacity="0.55">여러 직무에 통하는 정도 →</text>
        <text x={16} y={PAD.t + ih / 2} fontSize="11" fill="currentColor" opacity="0.55"
              transform={`rotate(-90 16 ${PAD.t + ih / 2})`} textAnchor="middle">희소성 →</text>

        {/* 점 */}
        {shown.map((s) => {
          const r = 4 + s.proficiency * 7;
          const isKey = s.quadrant === 'leverage';
          return (
            <g key={s.id}>
              <circle cx={x(s.spread)} cy={y(s.scarcity)} r={r}
                      fill={QUAD_COLOR[s.quadrant]} opacity={isKey ? 0.9 : 0.45} />
              {isKey && (
                <text x={x(s.spread)} y={y(s.scarcity) - r - 5} textAnchor="middle"
                      fontSize="10.5" fill="currentColor" opacity="0.85">{s.name}</text>
              )}
            </g>
          );
        })}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
        {(['leverage', 'lockin', 'common'] as Quadrant[]).map((q) => (
          <li key={q} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full"
                  style={{ background: QUAD_COLOR[q] }} />
            {QUAD_LABEL[q]}
          </li>
        ))}
      </ul>
    </div>
  );
}
