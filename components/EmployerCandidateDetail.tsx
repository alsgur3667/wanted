import { useId } from 'react';
import { skillNames, WORK_MODE_LABEL } from '@/lib/company-index';
import { APPLICATION_STAGE_LABEL, APPLICATION_STAGES } from '@/lib/employer-index';
import { getSkill } from '@/lib/skill-index';
import { isNewcomer } from '@/types';
import type { ApplicationStage, EmployerCandidateMatch } from '@/types';

export default function EmployerCandidateDetail({ match, onStageChange }: {
  match: EmployerCandidateMatch;
  onStageChange: (stage: ApplicationStage) => void;
}) {
  const candidate = match.candidate;
  const stageId = useId();
  const evidence = new Map(candidate.skillEvidence.map((row) => [row.skillId, row.evidence]));

  return (
    <aside className="animate-rise rounded-xl border border-hairline bg-elevated p-5 lg:sticky lg:top-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-faint">후보 상세 · 가상 지원자</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-ink">{candidate.alias}</h2>
          <p className="mt-1 text-[12px] text-mute">
            {candidate.currentJobTitle} · {isNewcomer(candidate.careerMonths) ? '신입' : `${Math.floor(candidate.careerMonths / 12)}년차`}
          </p>
        </div>
        <div className="text-right">
          <strong className="text-3xl tabular-nums text-ink">{match.fitScore}</strong>
          <p className="text-[10px] text-faint">역량 적합도</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-[76px_1fr] gap-y-2 border-y border-hairline py-4 text-[12px]">
        <dt className="text-faint">지원일</dt><dd>{match.application.appliedAt}</dd>
        <dt className="text-faint">지원 경로</dt><dd>{match.application.source === 'direct' ? '직접 지원' : '역량 추천 유입'}</dd>
        <dt className="text-faint">지역</dt><dd>{candidate.location}</dd>
        <dt className="text-faint">희망 근무</dt><dd>{candidate.desiredWorkModes.map((mode) => WORK_MODE_LABEL[mode]).join(' · ')}</dd>
      </dl>

      <p className="mt-5 text-[13px] leading-[1.7] text-body">{candidate.summary}</p>

      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[13px] font-medium text-ink">역량 판단 근거</h3>
          <span className="text-[10px] text-faint">
            필수 {Math.round(match.mustCoverage * 100)}% · 우대 {Math.round(match.niceCoverage * 100)}%
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {match.matchedSkillIds.slice(0, 6).map((skillId) => (
            <li key={skillId} className="rounded-lg bg-hairline-soft px-3 py-2.5">
              <p className="text-[12px] font-medium text-ink">{getSkill(skillId)?.name ?? skillId}</p>
              <p className="mt-1 text-[11px] leading-[1.6] text-mute">
                {evidence.get(skillId) ?? '보유 역량 목록에서 확인된 항목입니다.'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {match.gapSkillIds.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[13px] font-medium text-ink">확인이 필요한 필수 역량</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skillNames(match.gapSkillIds).map((name) => (
              <span key={name} className="rounded-md bg-warning-soft px-2 py-1 text-[11px] text-warning">{name}</span>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-faint">
            온보딩 {match.onboardingMonths}개월은 학습 난이도 기반 목업 추정치이며 실제 예측값이 아닙니다.
          </p>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-[13px] font-medium text-ink">경험 요약</h3>
        <ul className="mt-2 space-y-2 text-[12px] leading-relaxed text-body">
          {candidate.experienceHighlights.map((item) => <li key={item}>· {item}</li>)}
        </ul>
      </section>

      <section className="mt-6 border-t border-hairline pt-4">
        <label htmlFor={stageId} className="text-[11px] font-medium text-mute">전형 상태</label>
        <select
          id={stageId}
          value={match.application.stage}
          onChange={(event) => onStageChange(event.target.value as ApplicationStage)}
          className="mt-2 w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-link"
        >
          {APPLICATION_STAGES.map((stage) => (
            <option key={stage} value={stage}>{APPLICATION_STAGE_LABEL[stage]}</option>
          ))}
        </select>
        <p className="mt-2 text-[10px] leading-relaxed text-faint">화면 확인용 상태이며 새로고침하면 초기화됩니다.</p>
      </section>
    </aside>
  );
}
