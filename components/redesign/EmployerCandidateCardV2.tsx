// ============================================================================
//  EmployerCandidateCardV2.tsx — Career Navi · 2026-09-17
//  기업 워크스페이스 후보 카드. 표시 규칙(직무 전환 배지 · 경력 조건 · 매칭 역량 4개 ·
//  적합도 · 전형 상태)은 EmployerCandidateCard 와 같고 마크업만 바꿨다.
// ============================================================================

import { ArrowRight } from 'lucide-react';
import { skillNames } from '@/lib/company-index';
import { APPLICATION_STAGE_LABEL } from '@/lib/employer-index';
import { isNewcomer } from '@/types';
import type { EmployerCandidateMatch } from '@/types';

export default function EmployerCandidateCardV2({ match, selected, onSelect }: {
  match: EmployerCandidateMatch; selected: boolean; onSelect: () => void;
}) {
  const c = match.candidate;
  const R = 20;
  const C = 2 * Math.PI * R;
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`cand-card${selected ? ' is-selected' : ''}`}>
      <span className="cand-avatar">{c.alias.replace('지원자 ', '')}</span>
      <div className="cand-main">
        <div className="cand-title">
          <strong>{c.alias}</strong>
          {match.isDifferentRole && <span className="tag tag-amber">직무 전환</span>}
          {!match.careerFit && <span className="tag">경력 조건 확인</span>}
        </div>
        <p>{c.currentJobTitle} · {isNewcomer(c.careerMonths) ? '신입' : `${Math.floor(c.careerMonths / 12)}년차`}</p>
        <ul className="cand-skills">{skillNames(match.matchedSkillIds).slice(0, 4).map((n) => <li key={n}>{n}</li>)}</ul>
      </div>
      <div className="cand-side">
        {/* ⚠️ 클래스 이름을 'ring' 으로 되돌리지 말 것.
            Tailwind v4 에 같은 이름의 유틸리티가 있어 box-shadow: 0 0 0 1px 이
            자동으로 붙는다. 도넛 둘레에 검은 네모가 생긴다. */}
        <span className="fit-ring" aria-label={`적합도 ${match.fitScore}`}>
          <svg viewBox="0 0 52 52" width="52" height="52" aria-hidden>
            <circle cx="26" cy="26" r={R} fill="none" stroke="var(--hairline)" strokeWidth="4" />
            <circle cx="26" cy="26" r={R} fill="none" stroke={match.isDifferentRole ? 'var(--sun)' : 'var(--brand)'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${C * match.fitScore / 100} ${C}`} transform="rotate(-90 26 26)" />
          </svg>
          <b>{match.fitScore}</b>
        </span>
        <span className="stage">{APPLICATION_STAGE_LABEL[match.application.stage]}</span>
      </div>
      <span className="cand-action">역량 근거 살펴보기 <ArrowRight size={13} aria-hidden /></span>
    </button>
  );
}
