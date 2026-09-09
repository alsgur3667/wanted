// ============================================================================
//  커리어 지도 — 좌표계 하나
//
//  이 제품의 이름이 '내비'다. 그러면 첫 화면이 지도여야 한다.
//  히어로와 경로 탐색 로딩 화면이 같은 지도를 쓴다 — 두 곳에서 다른 그림을 쓰면
//  "아까 그거"라는 연결이 끊긴다.
//
//  ── 왜 진짜 3D 가 아닌가
//  바닥면 하나에 점을 찍는 그림이라 카메라를 돌릴 일이 없다. 원근을 손으로
//  계산하면 SVG 로 끝나고, 라이브러리도 WebGL 도 필요 없다. 모바일에서 무겁지
//  않고, 텍스트가 SVG 안에 남아 화면 낭독기에도 읽힌다.
//
//  ── 좌표
//  (u, v) 로 바닥을 나타낸다. u 는 좌우 0~1, v 는 깊이 0(가까움)~1(멀어짐).
//  멀수록 가로폭이 좁아지고(소실점), 위로 올라가고, 작아지고, 흐려진다.
//  이 네 가지가 같이 움직여야 눈이 '깊이'로 읽는다.
// ============================================================================

export const MAP_W = 1200;
export const MAP_H = 520;

const NEAR_Y = 470;
const FAR_Y = 92;
const CX = MAP_W / 2;
const NEAR_HALF = 560;
const FAR_HALF = 150;

export type Point = { x: number; y: number };

export function project(u: number, v: number): Point {
  const half = NEAR_HALF + (FAR_HALF - NEAR_HALF) * v;
  return {
    x: CX + (u - 0.5) * 2 * half,
    y: NEAR_Y + (FAR_Y - NEAR_Y) * v,
  };
}

/** 멀리 있는 것은 작게. 점 크기와 글자 크기에 같이 곱한다 */
export function depthScale(v: number): number {
  return 1 - 0.52 * v;
}

// ── 노드 ────────────────────────────────────────────────────────────────
//  ⚠️ 위치를 Math.random 으로 뽑지 않는다. 서버가 그린 좌표와 브라우저가 그린
//     좌표가 달라져 하이드레이션 경고가 나고, 새로고침마다 그림이 달라져
//     "아까 본 그 화면"이 되지 못한다. 흩어져 보이되 값은 고정한다.

export type MapNode = {
  id: string;
  name: string;
  u: number;
  v: number;
  /** '몰랐던 경로' — 앰버로 그린다. 하나뿐이어야 뜻이 산다 */
  hidden?: boolean;
};

/** 출발지. 화면 아래 가운데 — 여기서 위로 뻗어 나간다 */
export const ORIGIN: MapNode = { id: 'origin', name: '커리어', u: 0.5, v: 0.04 };

// 경로가 닿는 곳 다섯.
//
// 셋일 때는 부채가 안 펴져서 지도라기보다 갈래 그림처럼 보였다. 다섯이면
// 가운데가 차면서 '갈 데가 많다'가 먼저 읽힌다.
//
// ⚠️ 이름표가 서로 겹치지 않게 손으로 배치한 좌표다. 값을 옮길 때는
//    project() 로 실제 x·y 를 계산해 세로로 40px 이상 떨어졌는지 확인할 것.
//    멀리 있는 것일수록 좁은 폭에 몰리기 때문에 u 를 조금만 바꿔도 붙는다.
//
// 마지막이 앰버다. 순서상 맨 뒤에 그려져야 "그리고 이 길도 있어요"가 된다.
//
// ── 왜 묶음이 여러 벌인가
// 히어로에서 같은 다섯 갈래만 반복하면 "이 서비스는 다섯 개를 안다"로 읽힌다.
// 묶음을 바꿔 가며 그리면 매번 다른 점으로 길이 뻗어, 갈 수 있는 곳이 훨씬
// 많고 그중 다섯을 골라 보여주는 중이라는 게 움직임만으로 전달된다.

const AT = {
  planner: { id: 'planner', name: '서비스 기획자', u: 0.16, v: 0.44 },
  pm: { id: 'pm', name: '프로덕트 매니저', u: 0.28, v: 0.72 },
  da: { id: 'da', name: '데이터 분석가', u: 0.62, v: 0.86 },
  growth: { id: 'growth', name: '그로스 마케터', u: 0.84, v: 0.55 },
  csm: { id: 'csm', name: '고객 성공 매니저', u: 0.72, v: 0.3 },
  uxr: { id: 'uxr', name: 'UX 리서처', u: 0.1, v: 0.24 },
  ppm: { id: 'ppm', name: '프로젝트 매니저', u: 0.46, v: 0.6 },
  biz: { id: 'biz', name: '사업·전략 기획', u: 0.9, v: 0.78 },
  qa: { id: 'qa', name: 'QA 엔지니어', u: 0.34, v: 0.2 },
  de: { id: 'de', name: '데이터 엔지니어', u: 0.68, v: 0.66 },
  ops: { id: 'ops', name: '서비스 운영', u: 0.2, v: 0.9 },
} as const satisfies Record<string, MapNode>;

const hide = (n: MapNode): MapNode => ({ ...n, hidden: true });

// ⚠️ 묶음을 고치거나 새로 만들 때는 이름표가 겹치지 않는지 반드시 확인할 것.
//    멀리 있는 노드일수록 좁은 폭에 몰려서 u 를 0.05 만 옮겨도 옆 이름과 붙는다.
//    project() 로 x·y 를 뽑아 가로는 이름 너비의 절반 합, 세로는 글자 높이만큼
//    떨어졌는지 보면 된다.
export const ROUTE_ROUNDS: MapNode[][] = [
  [AT.planner, AT.pm, AT.da, AT.growth, hide(AT.csm)],
  [AT.uxr, AT.ppm, AT.de, AT.qa, hide(AT.biz)],
  [AT.pm, AT.ops, AT.growth, AT.uxr, hide(AT.qa)],
];

/** 기본 묶음. 로딩 화면과 로그인 화면은 이것만 쓴다 */
export const DESTINATIONS: MapNode[] = ROUTE_ROUNDS[0];

/** 배경에 흩어진 회사들. 갈 수 있는 곳이 이만큼 있다는 것만 말한다 */
export const SCATTER: { u: number; v: number }[] = [
  { u: 0.08, v: 0.2 }, { u: 0.17, v: 0.41 }, { u: 0.3, v: 0.16 },
  { u: 0.36, v: 0.35 }, { u: 0.42, v: 0.72 }, { u: 0.47, v: 0.24 },
  { u: 0.58, v: 0.34 }, { u: 0.63, v: 0.66 }, { u: 0.68, v: 0.14 },
  { u: 0.72, v: 0.79 }, { u: 0.85, v: 0.29 }, { u: 0.9, v: 0.6 },
  { u: 0.26, v: 0.86 }, { u: 0.12, v: 0.7 }, { u: 0.95, v: 0.82 },
  { u: 0.55, v: 0.55 },
];

// ── 경로 ────────────────────────────────────────────────────────────────
//  직선으로 이으면 별자리처럼 보이지 실제 길로 안 읽힌다. 살짝 휘어야
//  '돌아가는 길'이라는 뜻이 생긴다. 휘는 방향은 목적지가 어느 쪽에 있느냐로 정한다.

export function routePath(from: MapNode, to: MapNode): string {
  const a = project(from.u, from.v);
  const b = project(to.u, to.v);
  const bend = (to.u - from.u) * 130;
  const c1 = { x: a.x + bend * 0.35, y: a.y - (a.y - b.y) * 0.42 };
  const c2 = { x: b.x - bend * 0.5, y: b.y + (a.y - b.y) * 0.28 };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
}

/** 소실점으로 모이는 세로선과 가로로 눕는 선. 바닥이 있다는 것만 알리면 된다 */
export const GRID_U = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
export const GRID_V = [0, 0.18, 0.36, 0.54, 0.72, 0.88, 1];
