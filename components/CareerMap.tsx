import type { MapNode } from '@/lib/career-map';
import {
  DESTINATIONS,
  depthScale,
  GRID_U,
  GRID_V,
  MAP_H,
  MAP_W,
  ORIGIN,
  project,
  routePath,
  SCATTER,
} from '@/lib/career-map';

// ============================================================================
//  커리어 지도 — 그리는 쪽
//
//  히어로와 로딩 화면이 이 컴포넌트 하나를 공유한다. 다른 것은 `reveal` 뿐 —
//  경로를 몇 개까지 그렸는지다. 로딩 화면은 이 값을 1 → 2 → 3 으로 올려
//  "찾는 중"을 눈에 보이게 만들고, 히어로는 처음부터 3 을 준 뒤
//  CSS 로 순서대로 그려지게 둔다.
//
//  색: 청록은 '찾아낸 길', 앰버는 '몰랐던 길'. 화면 나머지 규칙과 같다.
// ============================================================================

// 경로 하나가 그려지기 시작하는 간격. 다섯 갈래가 되면서 줄였다 —
// 원래 간격(420ms)이면 마지막 경로가 2.5초 뒤에야 시작해 로딩 한 바퀴를 넘긴다.
const DRAW_GAP = 260;

export default function CareerMap({
  /** 어디로 가는 길을 그릴지. 생략하면 기본 묶음 */
  destinations = DESTINATIONS,
  /** 그중 몇 개까지 그릴지. 생략하면 전부 */
  reveal,
  /** 경로가 스스로 그려지는 애니메이션을 켤지 */
  animated = true,
  /** 바닥·회사·출발지도 새로 등장시킬지.
      묶음만 갈아 끼우며 반복할 때는 꺼 둔다 — 매번 바닥까지 다시 나타나면
      지도가 깜빡이는 것처럼 보이고, 정작 봐야 할 경로에서 눈이 떠난다. */
  animateBase = true,
  presentation = 'default',
  originLabel = ORIGIN.name,
  origin = ORIGIN,
  brandOrigin = false,
  direction = 'outgoing',
  className = '',
}: {
  destinations?: MapNode[];
  reveal?: number;
  animated?: boolean;
  animateBase?: boolean;
  presentation?: 'default' | 'login';
  originLabel?: string;
  origin?: MapNode;
  brandOrigin?: boolean;
  direction?: 'outgoing' | 'incoming';
  className?: string;
}) {
  const shown = destinations.slice(0, reveal ?? destinations.length);
  const baseAnim = animated && animateBase;
  const originPoint = project(origin.u, origin.v);

  return (
    <svg
      viewBox={presentation === 'login' ? `200 80 800 435` : `0 0 ${MAP_W} ${MAP_H}`}
      className={className}
      role="img"
      aria-label={direction === 'incoming' ? `여러 직무의 경험을 가진 인재가 ${originLabel}로 모이는 경로 지도` : `${originLabel}에서 여러 가능성으로 뻗어 나가는 경로 지도`}
    >
      <defs>
        {/* 멀어질수록 바닥이 사라진다. 지평선을 선으로 긋는 것보다 자연스럽다 */}
        <linearGradient id="map-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--canvas)" stopOpacity="1" />
          <stop offset="42%" stopColor="var(--canvas)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--canvas)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="origin-glow">
          <stop offset="0%" stopColor="var(--link)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--link)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── 바닥 ── */}
      <g className={baseAnim ? 'map-grid' : undefined} stroke="var(--hairline)" fill="none">
        {GRID_U.map((u) => {
          const a = project(u, 0);
          const b = project(u, 1);
          return <line key={`u${u}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth="1" />;
        })}
        {GRID_V.map((v) => {
          const a = project(0, v);
          const b = project(1, v);
          return <line key={`v${v}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth="1" />;
        })}
      </g>
      <rect x="0" y={project(0, 1).y - 40} width={MAP_W} height={220} fill="url(#map-fade)" />

      {/* ── 흩어진 회사들 ── */}
      <g className={baseAnim ? 'map-scatter' : undefined}>
        {SCATTER.map((n, i) => {
          const p = project(n.u, n.v);
          const s = depthScale(n.v);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.4 * s}
              fill="var(--faint)"
              fillOpacity={0.55 * s + 0.12}
            />
          );
        })}
      </g>

      {/* ── 경로 ──
          마지막 경로만 앰버다. 스스로는 떠올리지 못하는 길이라는 뜻이고,
          이 제품이 하려는 말이 정확히 그것이다. */}
      <g fill="none" strokeLinecap="round">
        {shown.map((d, i) => (
          <path
            key={d.id}
            className={animated ? 'map-route' : undefined}
            style={animated ? { animationDelay: `${380 + i * DRAW_GAP}ms` } : undefined}
            d={direction === 'incoming' ? routePath(d, origin) : routePath(origin, d)}
            pathLength={100}
            stroke={d.hidden ? 'var(--warning)' : 'var(--link)'}
            strokeWidth={d.hidden ? 2.4 : 2}
            strokeOpacity={d.hidden ? 0.95 : 0.8}
          />
        ))}
      </g>

      {/* ── 도착지 ── */}
      <g>
        {shown.map((d, i) => {
          const p = project(d.u, d.v);
          const s = depthScale(d.v);
          const color = d.hidden ? 'var(--warning)' : 'var(--link)';
          return (
            <g
              key={d.id}
              className={animated ? 'map-stop' : undefined}
              style={animated ? { animationDelay: `${760 + i * DRAW_GAP}ms` } : undefined}
            >
              <circle cx={p.x} cy={p.y} r={9 * s} fill={color} fillOpacity="0.16" />
              <circle
                cx={p.x}
                cy={p.y}
                r={4.6 * s}
                fill="var(--canvas)"
                stroke={color}
                strokeWidth={2 * s}
              />
              <text
                x={p.x}
                y={p.y - (presentation === 'login' ? 20 : 16 * s)}
                textAnchor="middle"
                fontSize={presentation === 'login' ? 20 : 13 * s}
                fontWeight="500"
                fill="var(--ink)"
                stroke="var(--canvas)"
                strokeWidth={presentation === 'login' ? 5 : 3.5 * s}
                paintOrder="stroke"
              >
                {d.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* ── 출발지 ──
          가장 크고 가장 가깝다. 여기가 '나'다. */}
      <g className={baseAnim ? 'map-origin' : undefined}>
        <circle cx={originPoint.x} cy={originPoint.y} r="46" fill="url(#origin-glow)" />
        <circle
          cx={originPoint.x}
          cy={originPoint.y}
          r="8"
          fill="var(--link)"
          stroke="var(--canvas)"
          strokeWidth="3"
        />
        <text
          x={originPoint.x}
          y={originPoint.y + 30}
          textAnchor="middle"
          fontSize={presentation === 'login' ? 19 : 14}
          fontWeight="600"
          fill="var(--ink)"
          stroke="var(--canvas)"
          strokeWidth="4"
          paintOrder="stroke"
        >
          {brandOrigin ? <>Career <tspan fill="var(--link)">Navi</tspan></> : originLabel}
        </text>
      </g>
    </svg>
  );
}
