// ============================================================================
//  SkillMapV2.tsx — Career Navi · 2026-09-17
//  역량 분포도 다시 그리기. 축 두 개(여러 직무에 통하는 정도 × 학습 난이도)는
//  같지만, 사분면을 면으로 칠해 처음 보는 사람도 '오른쪽 위가 좋은 자리'를
//  읽게 했다. 피벗 무기는 청록 채움, 락인은 잉크 테두리, 기본기는 모래색.
//  이름표는 피벗 무기 3개만 붙이고 나머지는 호버.
// ============================================================================

import type { Quadrant, Skill } from '@/types';

const W = 640;
const H = 420;
const PAD = { l: 52, r: 28, t: 34, b: 48 };
const PINNED = 3;
const LABEL_H = 14;
const LABEL_W = 72;

const LABEL: Record<Quadrant, string> = { leverage: '피벗 무기', lockin: '도메인 락인', common: '기본기', noise: '노이즈' };

export default function SkillMapV2({ skills }: { skills: Skill[] }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (v: number) => PAD.l + v * iw;
  const y = (v: number) => PAD.t + (1 - v) * ih;
  const shown = skills.filter((s) => s.quadrant !== 'noise').sort((a, b) => a.spread - b.spread);
  const radius = (s: Skill) => 5 + s.proficiency * 8;

  const pinned = new Set(
    shown.filter((s) => s.quadrant === 'leverage').sort((a, b) => b.spread + b.scarcity - (a.spread + a.scarcity)).slice(0, PINNED).map((s) => s.id)
  );
  const placed: { x: number; y: number }[] = [];
  const labelY = new Map<string, number>();
  for (const s of shown) {
    const cx = x(s.spread);
    let ly = y(s.scarcity) - radius(s) - 8;
    if (pinned.has(s.id)) {
      let guard = 0;
      while (guard++ < 8 && placed.some((p) => Math.abs(p.x - cx) < LABEL_W && Math.abs(p.y - ly) < LABEL_H)) ly -= LABEL_H;
      placed.push({ x: cx, y: ly });
    }
    labelY.set(s.id, Math.max(PAD.t + 10, ly));
  }

  const dotStyle = (s: Skill) => {
    switch (s.quadrant) {
      case 'leverage': return { fill: 'var(--brand)', fillOpacity: 0.85, stroke: 'var(--elevated)' };
      case 'lockin': return { fill: 'var(--elevated)', fillOpacity: 1, stroke: 'var(--ink)' };
      default: return { fill: 'var(--sun-soft)', fillOpacity: 1, stroke: 'var(--sun)' };
    }
  };

  return (
    <div className="skillmap-v2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="역량 분포도 — 가로: 여러 직무에 통하는 정도, 세로: 학습 난이도">
        <g className="plot-frame">
          {/* 사분면 면 */}
          <rect x={x(0.5)} y={y(1)} width={iw / 2} height={ih / 2} rx="10" fill="var(--brand-soft)" />
          <rect x={x(0)} y={y(1)} width={iw / 2} height={ih / 2} rx="10" fill="var(--hairline-soft)" />
          <rect x={x(0.5)} y={y(0.5)} width={iw / 2} height={ih / 2} rx="10" fill="var(--sun-soft)" fillOpacity="0.55" />
          <rect x={x(0)} y={y(0.5)} width={iw / 2} height={ih / 2} rx="10" fill="var(--canvas)" />
          {/* 구분선 */}
          <line x1={x(0.5)} y1={PAD.t} x2={x(0.5)} y2={y(0)} stroke="var(--hairline)" />
          <line x1={PAD.l} y1={y(0.5)} x2={x(1)} y2={y(0.5)} stroke="var(--hairline)" />
          {/* 사분면 이름 */}
          <text x={x(0.98)} y={y(0.95)} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--brand-deep)">{LABEL.leverage}</text>
          <text x={x(0.02)} y={y(0.95)} fontSize="12" fontWeight="600" fill="var(--ink)">{LABEL.lockin}</text>
          <text x={x(0.98)} y={y(0.05)} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--sun-deep)">{LABEL.common}</text>
          {/* 축 이름 */}
          <text x={PAD.l + iw / 2} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--mute)">여러 직무에 통하는 정도 →</text>
          <text x={16} y={PAD.t + ih / 2} fontSize="11" fill="var(--mute)" transform={`rotate(-90 16 ${PAD.t + ih / 2})`} textAnchor="middle">학습 난이도(추정) →</text>
        </g>
        {shown.map((s, i) => {
          const r = radius(s);
          const cx = x(s.spread);
          const cy = y(s.scarcity);
          const st = dotStyle(s);
          return (
            <g key={s.id} className="dot plot-dot" style={{ animationDelay: `${380 + i * 60}ms`, ['--r-hover' as string]: `${r + 5}` }}>
              <title>{`${s.name} · ${LABEL[s.quadrant]}`}</title>
              <circle cx={cx} cy={cy} r={r + 8} fill="transparent" />
              <circle className="dot-core" cx={cx} cy={cy} r={r} fill={st.fill} fillOpacity={st.fillOpacity} stroke={st.stroke} strokeWidth="1.8" />
              <text className={`dot-name${pinned.has(s.id) ? ' is-pinned' : ''}`} x={cx} y={labelY.get(s.id)} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--ink)" stroke="var(--elevated)" strokeWidth="3.5" paintOrder="stroke">
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span><i style={{ background: 'var(--brand)' }} />피벗 무기 — 여러 직무에 통하고 배우기 어려운 것</span>
        <span><i style={{ background: 'var(--elevated)', borderColor: 'var(--ink)' }} />도메인 락인 — 지금 자리에서만 강한 것</span>
        <span><i style={{ background: 'var(--sun-soft)', borderColor: 'var(--sun)' }} />기본기</span>
        <small>점 크기는 숙련도. 점에 마우스를 올리면 이름이 보입니다.</small>
      </div>
    </div>
  );
}
