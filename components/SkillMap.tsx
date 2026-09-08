import type { Skill, Quadrant } from '@/types';

const W = 520;
const H = 460;
const PAD = { l: 58, r: 26, t: 26, b: 52 };

// 사분면마다 다른 색을 주지 않는다. '피벗 무기'만 청록으로 띄우고
// 나머지는 회색 두 단계로 가라앉힌다.
//
// 보라(--violet)를 뺐다. 이 화면에서만 쓰이던 색이라 다른 어디와도 이어지지 않았고,
// 다크 배경에서 글씨가 묻혔다. 락인과 흔한 역량은 ink / faint 로도 충분히 갈린다.
const QUAD_COLOR: Record<Quadrant, string> = {
  leverage: 'var(--link)',
  lockin: 'var(--ink)',
  common: 'var(--mute)',
  noise: 'var(--faint)',
};

const QUAD_LABEL: Record<Quadrant, string> = {
  leverage: '피벗 무기',
  lockin: '도메인 락인',
  common: '흔한 역량',
  noise: '노이즈',
};

// 축이 다 그려진 뒤에 점을 놓기 시작한다
const DOT_START = 420;
const DOT_GAP = 65;

/** 기본으로 붙여 둘 이름표 수. 나머지는 마우스를 올리면 보인다 */
const PINNED_LABELS = 3;
const LABEL_H = 14;
const LABEL_W = 70;

export default function SkillMap({ skills }: { skills: Skill[] }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (v: number) => PAD.l + v * iw;
  const y = (v: number) => PAD.t + (1 - v) * ih;

  // 왼쪽부터 찍는다 — 가로축이 '여러 직무에 통하는 정도'라
  // 찍히는 순서 자체가 축의 뜻을 설명한다.
  const shown = skills.filter((s) => s.quadrant !== 'noise').sort((a, b) => a.spread - b.spread);
  const radius = (s: Skill) => 4 + s.proficiency * 7;

  // ── 기본으로 붙일 이름표 고르기 ──────────────────────────────
  //  점이 몰리는 구간에서는 이름표가 서로 겹쳐 읽을 수 없다.
  //  피벗 무기 중 오른쪽 위에 있는 것 몇 개만 붙이고, 나머지는 호버에 맡긴다.
  const pinned = new Set(
    shown
      .filter((s) => s.quadrant === 'leverage')
      .sort((a, b) => b.spread + b.scarcity - (a.spread + a.scarcity))
      .slice(0, PINNED_LABELS)
      .map((s) => s.id)
  );

  //  붙여 둔 이름표끼리도 가까우면 한 줄씩 위로 밀어 올린다.
  const placed: { x: number; y: number }[] = [];
  const labelY = new Map<string, number>();
  for (const s of shown) {
    const cx = x(s.spread);
    let ly = y(s.scarcity) - radius(s) - 7;
    if (pinned.has(s.id)) {
      let guard = 0;
      while (
        guard++ < 8 &&
        placed.some((p) => Math.abs(p.x - cx) < LABEL_W && Math.abs(p.y - ly) < LABEL_H)
      ) {
        ly -= LABEL_H;
      }
      placed.push({ x: cx, y: ly });
    }
    labelY.set(s.id, Math.max(PAD.t + 10, ly));
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" role="img"
           aria-label="스킬 전이성 지도">
        <g className="plot-frame">
          {/* 사분면 배경 */}
          <rect x={x(0.5)} y={y(1)} width={iw / 2} height={ih / 2}
                fill="var(--link)" opacity="0.06" />

          {/* 축 */}
          <line x1={PAD.l} y1={y(0)} x2={x(1)} y2={y(0)} stroke="var(--hairline)" strokeWidth="1" />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={y(0)} stroke="var(--hairline)" strokeWidth="1" />
          {/* 사분면 구분선 */}
          <line x1={x(0.5)} y1={PAD.t} x2={x(0.5)} y2={y(0)}
                stroke="var(--hairline)" strokeDasharray="4 4" />
          <line x1={PAD.l} y1={y(0.5)} x2={x(1)} y2={y(0.5)}
                stroke="var(--hairline)" strokeDasharray="4 4" />

          {/* 사분면 라벨 */}
          <text x={x(0.97)} y={y(0.96)} textAnchor="end" fontSize="11"
                fill="var(--link)" fontWeight="500">피벗 무기</text>
          <text x={x(0.03)} y={y(0.96)} fontSize="11" fill="var(--mute)">도메인 락인</text>
          <text x={x(0.97)} y={y(0.04)} textAnchor="end" fontSize="11" fill="var(--faint)">흔한 역량</text>

          {/* 축 이름 */}
          <text x={PAD.l + iw / 2} y={H - 14} textAnchor="middle" fontSize="11"
                fill="var(--mute)">여러 직무에 통하는 정도 →</text>
          <text x={16} y={PAD.t + ih / 2} fontSize="11" fill="var(--mute)"
                transform={`rotate(-90 16 ${PAD.t + ih / 2})`} textAnchor="middle">학습 난이도(추정) →</text>
        </g>

        {/* 점 — 왼쪽부터 하나씩. 마우스를 올리면 커지면서 이름이 뜬다.
            테두리를 카드 배경색으로 둘러 겹친 점끼리 구분되게 한다. */}
        {shown.map((s, i) => {
          const r = radius(s);
          const cx = x(s.spread);
          const cy = y(s.scarcity);
          const isKey = s.quadrant === 'leverage';
          return (
            <g
              key={s.id}
              className="dot plot-dot"
              style={{ animationDelay: `${DOT_START + i * DOT_GAP}ms`, ['--r-hover' as string]: `${r + 5}` }}
            >
              <title>{`${s.name} · ${QUAD_LABEL[s.quadrant]}`}</title>
              {/* 작은 점도 쉽게 집히도록 투명한 판정 원을 깐다 */}
              <circle cx={cx} cy={cy} r={r + 8} fill="transparent" />
              <circle
                className="dot-core"
                cx={cx} cy={cy} r={r}
                fill={QUAD_COLOR[s.quadrant]}
                fillOpacity={isKey ? 0.75 : 0.32}
                stroke="var(--elevated)"
                strokeWidth="1.5"
              />
              <text
                className={`dot-name${pinned.has(s.id) ? ' is-pinned' : ''}`}
                x={cx} y={labelY.get(s.id)} textAnchor="middle"
                fontSize="10.5" fill="var(--ink)"
                stroke="var(--elevated)" strokeWidth="3.5" paintOrder="stroke"
              >
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-mute">
          {(['leverage', 'lockin', 'common'] as Quadrant[]).map((q) => (
            <li key={q} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full"
                    style={{ background: QUAD_COLOR[q] }} />
              {QUAD_LABEL[q]}
            </li>
          ))}
        </ul>
        <span className="text-[11px] text-faint">점에 마우스를 올리면 이름이 보여요</span>
      </div>
    </div>
  );
}
