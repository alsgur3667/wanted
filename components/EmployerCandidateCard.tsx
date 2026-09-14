import { skillNames } from '@/lib/company-index';
import { APPLICATION_STAGE_LABEL } from '@/lib/employer-index';
import { isNewcomer } from '@/types';
import type { EmployerCandidateMatch } from '@/types';

export default function EmployerCandidateCard({ match, selected, onSelect }: {
  match: EmployerCandidateMatch;
  selected: boolean;
  onSelect: () => void;
}) {
  const candidate = match.candidate;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`employer-candidate w-full rounded-xl border p-4 text-left transition-colors focus-visible:border-link focus-visible:outline-none ${
        selected ? 'border-link bg-link-soft' : 'border-hairline bg-elevated hover:border-link/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-hairline-soft text-sm font-semibold text-ink">
          {candidate.alias.replace('지원자 ', '')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <strong className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{candidate.alias}</strong>
            {match.isDifferentRole && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning">직무 전환</span>
            )}
            {!match.careerFit && (
              <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-mute">경력 조건 확인</span>
            )}
          </div>
          <p className="mt-1 truncate text-[12px] text-body">
            {candidate.currentJobTitle} · {isNewcomer(candidate.careerMonths) ? '신입' : `${Math.floor(candidate.careerMonths / 12)}년차`}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skillNames(match.matchedSkillIds).slice(0, 4).map((name) => (
              <span key={name} className="rounded-md border border-link/20 px-2 py-0.5 text-[10px] text-link">{name}</span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <strong className="text-xl tabular-nums text-ink">{match.fitScore}</strong>
          <p className="text-[10px] text-faint">적합도</p>
          <span className="mt-2 inline-block rounded-md bg-hairline-soft px-2 py-1 text-[10px] text-body">
            {APPLICATION_STAGE_LABEL[match.application.stage]}
          </span>
        </div>
      </div>
      <span className="employer-card-action">역량 근거 살펴보기 →</span>
    </button>
  );
}
