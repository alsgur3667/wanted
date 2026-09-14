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

// 색 규칙: 청록은 '내가 가진 것', 앰버는 '원래 안 보이던 것'.
// 무기 묶음은 전자다 — 여기를 앰버로 칠하면 자기 강점이 경고처럼 읽히고,
// 히든 경로 배지와 같은 색이라 무슨 뜻인지 구분되지 않는다.
const GROUPS: { key: Quadrant; label: string; hint: string; tone: string }[] = [
  {
    key: 'leverage',
    label: '여러 직무에 연결되는 강점',
    hint: '직무 수요와 역량 분포를 바탕으로 분류했습니다.',
    tone: 'border-link/30 bg-link-soft text-link-deep dark:text-link',
  },
  {
    key: 'lockin',
    label: '지금 자리에서 강한 것',
    hint: '이 직군에선 핵심인데, 밖에선 덜 쓰여요',
    tone: 'border-hairline bg-elevated text-ink',
  },
  {
    key: 'common',
    label: '기본기',
    hint: '대부분의 직무가 기본으로 봐요',
    tone: 'border-hairline bg-hairline-soft text-mute',
  },
];

const VISIBLE_PER_GROUP = 6;

function Group({ label, hint, tone, skills, selectedId, onSelect }: { label: string; hint: string; tone: string; skills: Skill[]; selectedId?: string; onSelect: (skill: Skill) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? skills : skills.slice(0, VISIBLE_PER_GROUP);
  const rest = skills.length - shown.length;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-[15px] font-medium tracking-[-0.015em] text-ink">{label}</h3>
        <span className="text-[12px] tabular-nums text-faint">{skills.length}가지</span>
      </div>
      <p className="mt-1 text-[12px] text-mute">{hint}</p>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <li key={s.id}><button type="button" className={`skill-choice ${tone}`} aria-pressed={selectedId === s.id} onClick={() => onSelect(s)}>{s.name} <span aria-hidden>↗</span></button></li>
        ))}
        {rest > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setAll(true)}
              className="rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:text-ink"
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
  const [selected, setSelected] = useState<Skill | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const grouped = GROUPS.map((g) => ({ ...g, skills: skills.filter((s) => s.quadrant === g.key) })).filter(
    (g) => g.skills.length > 0
  );

  const noLeverage = !grouped.some((g) => g.key === 'leverage');

  return (
    <section>
      <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-ink">내 역량</h2>
      <p className="mt-1.5 text-[13px] text-body">
        확인된 역량 {skills.filter(skill => skill.quadrant !== 'noise').length}가지를 쓰임새로 묶었습니다. 역량을 누르면 입력한 경험 속 근거를 볼 수 있습니다.
      </p>

      <div className="mt-6 space-y-6">
        {noLeverage && (
          <p className="rounded-md border border-hairline bg-hairline-soft px-3.5 py-3 text-[12px] leading-[1.6] text-body">
            여러 직군에 연결되는 강점을 확인할 근거가 부족합니다. 추천 경로의{' '}
            <strong className="font-medium text-ink">첫 단계</strong>에서 보완할 경험을 살펴보세요.
          </p>
        )}
        {grouped.map((g) => (
          <Group key={g.key} label={g.label} hint={g.hint} tone={g.tone} skills={g.skills} selectedId={selected?.id} onSelect={setSelected} />
        ))}
      </div>

      {selected && <aside className="skill-evidence" aria-live="polite"><h3>{selected.name} · 확인 근거</h3><p>{selected.evidence || '구체적인 경험 근거가 제공되지 않았습니다.'}</p></aside>}
      <div className="mt-7 border-t border-hairline pt-3.5">
        <button
          type="button"
          onClick={() => setMapOpen((v) => !v)}
          aria-expanded={mapOpen}
          className="flex items-center gap-1.5 text-[12px] text-mute transition-colors hover:text-ink"
        >
          <span aria-hidden className={`text-[10px] transition-transform duration-[620ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${mapOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
          분포도로 보기
        </button>
        <div className="collapsible" data-open={mapOpen} inert={!mapOpen}>
          <div>
            <div className="pt-4">
              <p className="mb-3 text-[12px] leading-[1.6] text-mute">
                오른쪽 위로 갈수록{' '}
                <strong className="font-medium text-ink">여러 직무에 통하면서 학습 난이도가 높은</strong>{' '}
                역량입니다. 세로축은 데이터 기반 추정치입니다.
              </p>
              {/* key 로 다시 마운트해 점 찍히는 애니메이션을 매번 재생한다.
                  내용이 항상 그려져 있어(접힘 애니메이션 때문) 그냥 두면
                  페이지가 뜰 때 보이지 않는 곳에서 이미 다 찍혀 버린다. */}
              <SkillMap key={mapOpen ? 'open' : 'closed'} skills={skills} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
