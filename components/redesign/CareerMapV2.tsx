// ============================================================================
//  CareerMapV2.tsx — Career Navi · 2026-09-17
//  커리어 지도 다시 그리기.
//
//  기존 CareerMap 은 격자 바닥 + 고정된 다섯 갈래(장식)였다. V2 는
//  1) 결과 화면에서는 **실제 추천 경로 3개**를 그린다 — 적합도가 높을수록 가깝고,
//     필수 역량 보유 비율이 도착지 링의 채움으로 보인다.
//  2) 로딩·로그인에서는 lib/career-map 의 장식 묶음을 그대로 받아 그린다.
//  바닥은 격자 대신 출발지에서 퍼지는 등고선(동심 호). '내비'라는 이름에
//  맞게 지도이되, 웜 팔레트(모래색 바닥·청록 길·앰버 '몰랐던 길')로 통일했다.
//  좌표계(project · routePath · depthScale)는 lib/career-map 을 그대로 쓴다.
// ============================================================================

import type { MapNode } from '@/lib/career-map';
import { depthScale, MAP_H, MAP_W, ORIGIN, project, routePath } from '@/lib/career-map';

export type MapRoute = MapNode & {
  /** 0~1 · 필수 역량 보유 비율. 도착지 링의 채움으로 그린다 */
  fill?: number;
  /** 도착지 아래 작은 글자 (예: "필수 5 / 8") */
  note?: string;
};

const DRAW_GAP = 260;

/** 결과 화면용 — 경로 3개를 적합도 순으로 지도 위에 놓는다 */
export function placeRoutes(routes: { id: string; name: string; fit: number; hidden: boolean; fill?: number; note?: string }[]): MapRoute[] {
  const slots = [0.2, 0.5, 0.8, 0.35, 0.65];
  return routes.map((r, i) => ({
    id: r.id,
    name: r.name,
    hidden: r.hidden,
    fill: r.fill,
    note: r.note,
    u: slots[i % slots.length],
    // 적합도가 높을수록 가깝다(v 작음). 0.42~0.86 사이에 둔다.
    v: 0.86 - Math.max(0, Math.min(1, r.fit)) * 0.44,
  }));
}

const RINGS = [0.16, 0.34, 0.52, 0.7, 0.88];

export default function CareerMapV2({
  destinations,
  reveal,
  animated = true,
  animateBase = true,
  originLabel = '나의 경험',
  className = '',
  compact = false,
  direction = 'outgoing',
}: {
  destinations: MapRoute[];
  reveal?: number;
  animated?: boolean;
  animateBase?: boolean;
  originLabel?: string;
  className?: string;
  /** 로딩 화면처럼 좁은 자리 — 가운데를 잘라 크게 보여준다 */
  compact?: boolean;
  /** incoming: 여러 곳에서 출발지로 모인다(기업 화면) */
  direction?: 'outgoing' | 'incoming';
}) {
  const shown = destinations.slice(0, reveal ?? destinations.length);
  const o = project(ORIGIN.u, ORIGIN.v);
  const baseAnim = animated && animateBase;

  return (
    <svg
      viewBox={compact ? '160 60 880 470' : `0 0 ${MAP_W} ${MAP_H}`}
      className={className}
      role="img"
      aria-label={direction === 'incoming' ? `${shown.map((d) => d.name).join(', ')}에서 ${originLabel}로 모이는 경로 지도` : `${originLabel}에서 ${shown.map((d) => d.name).join(', ')}로 이어지는 경로 지도`}
    >
      <defs>
        <linearGradient id="v2-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--canvas)" stopOpacity="1" />
          <stop offset="55%" stopColor="var(--canvas)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--canvas)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="v2-origin-glow">
          <stop offset="0%" stopColor="var(--sun)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--sun)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="v2-sun" cx="0.5" cy="0.1" r="0.6">
          <stop offset="0%" stopColor="var(--sun-soft)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--sun-soft)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 지평선 근처의 빛 — 시안의 노을 방향 */}
      <rect x="0" y="0" width={MAP_W} height={MAP_H * 0.55} fill="url(#v2-sun)" />

      {/* ── 바닥: 출발지에서 퍼지는 등고선 ── */}
      <g className={baseAnim ? 'map-grid' : undefined} fill="none" stroke="var(--hairline)">
        {RINGS.map((v, i) => {
          // 각 깊이에서 바닥 폭을 재어 타원 호로 그린다 — 원근이 같이 줄어든다
          const left = project(0, v);
          const right = project(1, v);
          const rx = (right.x - left.x) / 2;
          const ry = (o.y - left.y) * 0.32;
          return <ellipse key={v} cx={o.x} cy={left.y} rx={rx} ry={ry} strokeWidth={1} strokeOpacity={0.9 - i * 0.12} strokeDasharray={i % 2 ? '3 6' : undefined} />;
        })}
        {/* 소실점으로 모이는 방사선 셋 — 격자 대신 방향만 남긴다 */}
        {[0.12, 0.5, 0.88].map((u) => {
          const far = project(u, 1);
          return <line key={u} x1={o.x} y1={o.y} x2={far.x} y2={far.y} strokeWidth={1} strokeOpacity={0.5} />;
        })}
      </g>
      <rect x="0" y={project(0, 1).y - 30} width={MAP_W} height={200} fill="url(#v2-floor)" />

      {/* ── 경로 ── */}
      <g fill="none" strokeLinecap="round">
        {shown.map((d, i) => {
          const color = d.hidden ? 'var(--sun)' : 'var(--brand)';
          const path = direction === 'incoming' ? routePath(d, ORIGIN) : routePath(ORIGIN, d);
          return (
            <g key={d.id}>
              {/* 길 아래 옅은 바탕선 — 바닥 위에 놓인 길처럼 보이게 */}
              <path d={path} stroke="var(--elevated)" strokeWidth={d.hidden ? 9 : 8} strokeOpacity={0.9} />
              <path
                className={animated ? 'map-route' : undefined}
                style={animated ? { animationDelay: `${380 + i * DRAW_GAP}ms` } : undefined}
                d={path}
                pathLength={100}
                stroke={color}
                strokeWidth={d.hidden ? 3 : 2.4}
                strokeOpacity={d.hidden ? 0.95 : 0.85}
                strokeDasharray={d.hidden ? undefined : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* ── 도착지: 링(보유 비율) + 이름표 ── */}
      <g>
        {shown.map((d, i) => {
          const p = project(d.u, d.v);
          const s = depthScale(d.v);
          const color = d.hidden ? 'var(--sun)' : 'var(--brand)';
          const R = 11 * s;
          const C = 2 * Math.PI * R;
          const fill = d.fill === undefined ? 1 : Math.max(0.04, Math.min(1, d.fill));
          const fs = compact ? 18 : 13 * s + 3;
          return (
            <g key={d.id} className={animated ? 'map-stop' : undefined} style={animated ? { animationDelay: `${760 + i * DRAW_GAP}ms` } : undefined}>
              <circle cx={p.x} cy={p.y} r={R + 9 * s} fill={color} fillOpacity="0.12" />
              <circle cx={p.x} cy={p.y} r={R} fill="var(--elevated)" stroke="var(--hairline)" strokeWidth={2 * s} />
              {/* 보유 비율만큼 링을 채운다 — 위(12시)에서 시계 방향 */}
              <circle
                cx={p.x} cy={p.y} r={R} fill="none" stroke={color} strokeWidth={2.6 * s}
                strokeDasharray={`${C * fill} ${C}`} transform={`rotate(-90 ${p.x} ${p.y})`} strokeLinecap="round"
              />
              <circle cx={p.x} cy={p.y} r={3 * s} fill={color} />
              <text x={p.x} y={p.y - R - 10 * s} textAnchor="middle" fontSize={fs} fontWeight="600" fill="var(--ink)" stroke="var(--canvas)" strokeWidth={4} paintOrder="stroke">
                {d.name}
              </text>
              {d.note && (
                <text x={p.x} y={p.y + R + 16 * s} textAnchor="middle" fontSize={compact ? 13 : 11 * s + 2} fill={d.hidden ? 'var(--sun-deep)' : 'var(--brand-deep)'} stroke="var(--canvas)" strokeWidth={3} paintOrder="stroke">
                  {d.note}
                </text>
              )}
              {d.hidden && (
                <text x={p.x} y={p.y - R - 10 * s - fs - 4} textAnchor="middle" fontSize={compact ? 12 : 10 * s + 2} fontWeight="600" letterSpacing="0.08em" fill="var(--sun-deep)" stroke="var(--canvas)" strokeWidth={3} paintOrder="stroke">
                  이 길도 있어요
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* ── 출발지 ── */}
      <g className={baseAnim ? 'map-origin' : undefined}>
        <circle cx={o.x} cy={o.y} r="52" fill="url(#v2-origin-glow)" />
        <circle cx={o.x} cy={o.y} r="9" fill="var(--ink)" stroke="var(--canvas)" strokeWidth="3" />
        <text x={o.x} y={o.y + 32} textAnchor="middle" fontSize={compact ? 18 : 14} fontWeight="600" fill="var(--ink)" stroke="var(--canvas)" strokeWidth="4" paintOrder="stroke">
          {originLabel}
        </text>
      </g>
    </svg>
  );
}
