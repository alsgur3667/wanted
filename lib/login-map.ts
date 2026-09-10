import { project, type MapNode } from './career-map';

const jobs = [
  '서비스 기획자', '프로덕트 매니저', '데이터 분석가', '그로스 마케터',
  '고객 성공 매니저', 'UX 리서처', '프로젝트 매니저', '데이터 엔지니어',
  '사업·전략 기획', 'QA 엔지니어', '서비스 운영', '콘텐츠 마케터',
  '프로덕트 디자이너', '솔루션 영업', '사업 개발', '프론트엔드 개발자',
  '백엔드 개발자', '브랜드 마케터', '인사 담당자', '보안 엔지니어',
];

export const employerOrigin: MapNode = { id: 'career-navi', name: 'Career Navi', u: .5, v: .52 };

type Box = { left: number; right: number; top: number; bottom: number };
const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Conservative SVG text bounds, including the pin and space around the label.
// Korean glyphs use a full em; Latin text is deliberately overestimated.
export function labelBox(node: MapNode): Box {
  const p = project(node.u, node.v);
  const width = [...node.name].reduce((sum, ch) => sum + (/[가-힣]/.test(ch) ? 20 : 14), 0) + 28;
  return { left: p.x - width / 2, right: p.x + width / 2, top: p.y - 44, bottom: p.y + 16 };
}

function randomGenerator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createLoginScene(seed: number, employer: boolean, previous: MapNode[] = []): MapNode[] {
  const random = randomGenerator(seed);
  // Prefer five new labels every round; the pool always has enough remaining.
  const available = jobs.filter(name => !previous.some(node => node.id === name));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const names = available.slice(0, 5);
  const highlight = Math.floor(random() * 5);
  const hub: Box = employer
    ? { left: 520, right: 680, top: 244, bottom: 320 }
    : { left: 520, right: 680, top: 425, bottom: 510 };

  for (let attempt = 0; attempt < 60; attempt++) {
    const placed: MapNode[] = [];
    for (let i = 0; i < 5; i++) {
      for (let trial = 0; trial < 250; trial++) {
        const node = {
          id: names[i], name: names[i] + (employer ? ' 경험자' : ''),
          u: .06 + random() * .88, v: .10 + random() * .80,
          hidden: i === highlight,
        };
        const p = project(node.u, node.v);
        // Four quadrants ensure employer paths approach the hub from all sides.
        if (employer && i < 4 && ((p.x < 600) !== (i % 2 === 0) || (p.y < 273.44) !== (i < 2))) continue;
        const box = labelBox(node);
        if (box.left < 210 || box.right > 990 || box.top < 90 || box.bottom > 460 || overlaps(box, hub)) continue;
        if (placed.some(other => overlaps(box, labelBox(other)))) continue;
        if (previous.some(other => {
          const q = project(other.u, other.v);
          return Math.hypot(p.x - q.x, p.y - q.y) < 35;
        })) continue;
        placed.push(node);
        break;
      }
      if (placed.length !== i + 1) break;
    }
    if (placed.length === 5) return placed;
  }

  // Bounded fallback for unusually unlucky seeds: well-separated label rows.
  const points = [[600, 140], [365, 235], [835, 235], [365, 405], [835, 405]];
  return names.map((name, i) => {
    const [x, y] = points[i];
    const v = (470 - y) / 378;
    const half = 560 - 410 * v;
    return { id: name, name: name + (employer ? ' 경험자' : ''), u: .5 + (x - 600) / (2 * half), v, hidden: i === highlight };
  });
}
