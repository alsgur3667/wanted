'use client';

// ============================================================================
//  SkillGroupsV2.tsx — Career Navi · 2026-09-17
//  '내 역량' 탭. 묶음 규칙·근거 표시는 SkillGroups 와 같고, 분포도는
//  SkillMapV2 로 바꿨다. noise 는 여기서도 보여주지 않는다.
// ============================================================================

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Quadrant, Skill } from '@/types';
import SkillMapV2 from './SkillMapV2';

const GROUPS: { key: Quadrant; label: string; hint: string; tone: string }[] = [
  { key: 'leverage', label: '여러 직무에 연결되는 강점', hint: '직무 수요와 역량 분포를 바탕으로 분류했습니다.', tone: 'is-leverage' },
  { key: 'lockin', label: '지금 자리에서 강한 것', hint: '이 직군에선 핵심인데, 밖에선 덜 쓰여요', tone: 'is-lockin' },
  { key: 'common', label: '기본기', hint: '대부분의 직무가 기본으로 봐요', tone: 'is-common' },
];
const VISIBLE_PER_GROUP = 6;

function Group({ label, hint, tone, skills, selectedId, onSelect }: { label: string; hint: string; tone: string; skills: Skill[]; selectedId?: string; onSelect: (skill: Skill) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? skills : skills.slice(0, VISIBLE_PER_GROUP);
  const rest = skills.length - shown.length;
  return (
    <div className="skill-group">
      <div className="skill-group-head"><h3>{label}</h3><span>{skills.length}가지</span></div>
      <p>{hint}</p>
      <ul>
        {shown.map((s) => (
          <li key={s.id}><button type="button" className={`skill-chip ${tone}`} aria-pressed={selectedId === s.id} onClick={() => onSelect(s)}>{s.name}<span aria-hidden>↗</span></button></li>
        ))}
        {rest > 0 && <li><button type="button" className="skill-more" onClick={() => setAll(true)}>+{rest}개 더</button></li>}
      </ul>
    </div>
  );
}

export default function SkillGroupsV2({ skills }: { skills: Skill[] }) {
  const [selected, setSelected] = useState<Skill | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const grouped = GROUPS.map((g) => ({ ...g, skills: skills.filter((s) => s.quadrant === g.key) })).filter((g) => g.skills.length > 0);
  const noLeverage = !grouped.some((g) => g.key === 'leverage');
  const count = skills.filter((s) => s.quadrant !== 'noise').length;

  return (
    <section className="skills-v2">
      <div className="sec-title">
        <h2 className="hd">내 역량</h2>
        <p>확인된 역량 {count}가지를 쓰임새로 묶었습니다. 역량을 누르면 입력한 경험 속 근거를 볼 수 있습니다.</p>
      </div>
      <div className="skill-groups">
        {noLeverage && <p className="skill-note">여러 직군에 연결되는 강점을 확인할 근거가 부족합니다. 추천 경로의 <strong>첫 단계</strong>에서 보완할 경험을 살펴보세요.</p>}
        {grouped.map((g) => <Group key={g.key} label={g.label} hint={g.hint} tone={g.tone} skills={g.skills} selectedId={selected?.id} onSelect={setSelected} />)}
      </div>
      {selected && (
        <aside className="skill-evidence-v2" aria-live="polite">
          <span className="overline">Evidence</span>
          <h3>{selected.name}</h3>
          <p>{selected.evidence || '구체적인 경험 근거가 제공되지 않았습니다.'}</p>
        </aside>
      )}
      <div className="skill-map-toggle">
        <button type="button" onClick={() => setMapOpen((v) => !v)} aria-expanded={mapOpen}>
          <ChevronDown size={14} aria-hidden style={{ transform: mapOpen ? 'rotate(180deg)' : undefined, transition: 'transform .4s' }} />
          분포도로 보기
        </button>
        <div className="collapsible" data-open={mapOpen} inert={!mapOpen}>
          <div>
            <div className="skill-map-body">
              <p>오른쪽 위로 갈수록 <strong>여러 직무에 통하면서 학습 난이도가 높은</strong> 역량입니다. 세로축은 데이터 기반 추정치입니다.</p>
              <SkillMapV2 key={mapOpen ? 'open' : 'closed'} skills={skills} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
