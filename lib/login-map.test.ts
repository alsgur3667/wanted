import { describe, expect, it } from 'vitest';
import { createLoginScene, labelBox } from './login-map';
import { project, type MapNode } from './career-map';

describe('random login map scenes', () => {
  for (const employer of [false, true]) {
    it(`keeps labels apart and changes content (${employer ? 'employer' : 'personal'})`, () => {
      let previous: MapNode[] = [];
      const highlights = new Set<number>();
      for (let seed = 1; seed <= 200; seed++) {
        const scene = createLoginScene(seed * 7919, employer, previous);
        expect(scene).toHaveLength(5);
        expect(new Set(scene.map(node => node.id)).size).toBe(5);
        expect(scene.filter(node => node.hidden)).toHaveLength(1);
        highlights.add(scene.findIndex(node => node.hidden));
        for (const [i, node] of scene.entries()) {
          expect(previous.some(old => old.id === node.id)).toBe(false);
          const box = labelBox(node);
          expect(box.left).toBeGreaterThanOrEqual(210);
          expect(box.right).toBeLessThanOrEqual(990);
          expect(box.top).toBeGreaterThanOrEqual(90);
          expect(box.bottom).toBeLessThanOrEqual(460);
          for (const other of scene.slice(i + 1)) {
            const b = labelBox(other);
            expect(box.right <= b.left || box.left >= b.right || box.bottom <= b.top || box.top >= b.bottom).toBe(true);
          }
        }
        if (employer) {
          const points = scene.map(node => project(node.u, node.v));
          for (const left of [false, true]) for (const above of [false, true]) {
            expect(points.some(p => (p.x < 600) === left && (p.y < 273.44) === above)).toBe(true);
          }
        }
        previous = scene;
      }
      expect(highlights.size).toBe(5);
    });
  }
  it('renders the same initial scene on server and client', () => {
    expect(createLoginScene(31947, true)).toEqual(createLoginScene(31947, true));
  });
});
