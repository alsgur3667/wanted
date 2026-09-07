'use client';

import { useState } from 'react';
import type { Quadrant, Skill } from '@/types';
import SkillMap from './SkillMap';

// ============================================================================
//  내 역량 — 2×2 산점도를 묶음 목록으로 바꾼다.
//
//  산점도는 축 두 개를 동시에 읽어야 한다. 만든 사람에게는 편하지만
//  처음 보는 사람에게는 좌표 해석이 먼저다. 이 화면을 두 번 보는 사용자는
//  거의 없으므로 기본값이 곧 그 사람이 보는 전부다.
//
//  산점도는 지운 게 아니라 접었다. 분석 깊이를 버리지 않으면서
//  첫 화면은 누구나 읽히게 하는 절충이다.
//
//  noise 는 보여주지 않는다 — "당신의 이 역량은 노이즈입니다"는 할 말이 아니고,
//  사분면 중 오분류 위험이 가장 큰 자리이기도 하다.
// ============================================================================

const GROUPS: { key: Quadrant; label: string; hint: string; tone: string }[] = [
  {
    key: 'leverage',
    label: '어디서나 통하는 무기',
    hint: '여러 직군이 요구하는데, 갖춘 사람은 적어요',
    tone: 'bg-amber-400/15 text-amber-700 dark:text-amber-300',
  },
  {
    key: 'lockin',
    label: '지금 자리에서 강한 것',
    hint: '이 직군에선 핵심인데, 밖에선 덜 쓰여요',
    tone: 'bg-black/[0.05] dark:bg-white/[0.09]',
  },
  {
    key: 'common',
    label: '기본기',
    hint: '대부분의 직무가 기본으로 봐요',
    tone: 'bg-black/[0.035] opacity-75 dark:bg-white/[0.06]',
  },
];

const VISIBLE_PER_GROUP = 6;

function Group({ label, hint, tone, skills }: { label: string; hint: string; tone: string; skills: Skill[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? skills : skills.slice(0, VISIBLE_PER_GROUP);
  const rest = skills.length - shown.length;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-[15px] font-medium">{label}</h3>
        <span className="text-xs opacity-40">{skills.length}가지</span>
      </div>
      <p className="mt-0.5 text-xs opacity-55">{hint}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <li key={s.id} title={s.evidence} className={`rounded-full px-2.5 py-1 text-xs ${tone}`}>
            {s.name}
          </li>
        ))}
        {rest > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setAll(true)}
              className="rounded-full px-2 py-1 text-xs opacity-50 transition hover:opacity-90"
            >
              +{rest}개 더
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

export default function SkillGroups({ skills }: { skills: Skill[] }) {
  const [mapOpen, setMapOpen] = useState(false);
  const grouped = GROUPS.map((g) => ({ ...g, skills: skills.filter((s) => s.quadrant === g.key) })).filter(
    (g) => g.skills.length > 0
  );

  const noLeverage = !grouped.some((g) => g.key === 'leverage');

  return (
    <section>
      <h2 className="text-lg font-semibold">내 역량</h2>
      <p className="mt-1 text-sm opacity-60">
        이력서에서 찾은 {skills.length}가지를 쓰임새로 묶었어요.
      </p>

      <div className="mt-5 space-y-5">
        {noLeverage && (
          <p className="rounded-xl border border-dashed border-black/12 p-3.5 text-xs leading-relaxed opacity-65 dark:border-white/15">
            아직 직군을 넘나드는 무기는 안 보여요. 아래 경로의 <strong className="font-medium">첫 단계</strong>부터
            하나씩 채우면 생깁니다.
          </p>
        )}
        {grouped.map((g) => (
          <Group key={g.key} label={g.label} hint={g.hint} tone={g.tone} skills={g.skills} />
        ))}
      </div>

      <div className="mt-6 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => setMapOpen((v) => !v)}
          aria-expanded={mapOpen}
          className="flex items-center gap-1.5 text-xs opacity-55 transition hover:opacity-95"
        >
          <span aria-hidden className={`transition-transform ${mapOpen ? 'rotate-180' : ''}`}>▼</span>
          분포도로 보기
        </button>
        {mapOpen && (
          <div className="mt-4">
            <p className="mb-3 text-xs leading-relaxed opacity-55">
              오른쪽 위로 갈수록{' '}
              <strong className="font-medium opacity-90">여러 직무에 통하면서 학습 난이도가 높은</strong>{' '}
              역량입니다. 세로축은 데이터 기반 추정치입니다.
            </p>
            <SkillMap skills={skills} />
          </div>
        )}
      </div>
    </section>
  );
}
