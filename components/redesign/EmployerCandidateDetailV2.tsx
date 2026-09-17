// ============================================================================
//  EmployerCandidateDetailV2.tsx — Career Navi · 2026-09-17
//  후보 상세. 내용·전형 상태 변경은 EmployerCandidateDetail 과 같다.
//  적합도는 링, 필수/우대 커버율은 두 줄 게이지로 보이게 했다.
// ============================================================================

import { skillNames, WORK_MODE_LABEL } from '@/lib/company-index';
import { APPLICATION_STAGE_LABEL, APPLICATION_STAGES } from '@/lib/employer-index';
import { getSkill } from '@/lib/skill-index';
import { isNewcomer } from '@/types';
import type { ApplicationStage, EmployerCandidateMatch } from '@/types';

export default function EmployerCandidateDetailV2({ match, onStageChange }: {
  match: EmployerCandidateMatch; onStageChange: (stage: ApplicationStage) => void;
}) {
  const c = match.candidate;
  const evidence = new Map(c.skillEvidence.map((r) => [r.skillId, r.evidence]));
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <aside className="cand-detail rv">
      <div className="cd-head">
        <div>
          <span className="overline">Candidate · 가상 지원자</span>
          <h2 className="hd">{c.alias}</h2>
          <p>{c.currentJobTitle} · {isNewcomer(c.careerMonths) ? '신입' : `${Math.floor(c.careerMonths / 12)}년차`}{c.industry && ` · ${c.industry}`}</p>
        </div>
        <div className="cd-fit">
          <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden>
            <circle cx="36" cy="36" r={R} fill="none" stroke="var(--hairline)" strokeWidth="5" />
            <circle cx="36" cy="36" r={R} fill="none" stroke={match.isDifferentRole ? 'var(--sun)' : 'var(--brand)'} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${C * match.fitScore / 100} ${C}`} transform="rotate(-90 36 36)" />
          </svg>
          <b>{match.fitScore}</b>
          <span>역량 적합도</span>
        </div>
      </div>

      <dl className="cd-facts">
        <div><dt>지원일</dt><dd>{match.application.appliedAt}</dd></div>
        <div><dt>지원 경로</dt><dd>{match.application.source === 'direct' ? '직접 지원' : '역량 추천 유입'}</dd></div>
        <div><dt>지역</dt><dd>{c.location}</dd></div>
        <div><dt>희망 근무</dt><dd>{c.desiredWorkModes.map((m) => WORK_MODE_LABEL[m]).join(' · ')}</dd></div>
      </dl>

      <p className="cd-summary">{c.summary}</p>

      <div className="cd-coverage">
        <div><span>필수 역량</span><i><i style={{ width: `${Math.round(match.mustCoverage * 100)}%` }} /></i><b>{Math.round(match.mustCoverage * 100)}%</b></div>
        <div><span>우대 역량</span><i><i className="nice" style={{ width: `${Math.round(match.niceCoverage * 100)}%` }} /></i><b>{Math.round(match.niceCoverage * 100)}%</b></div>
      </div>

      <section className="cd-section">
        <h3>역량 판단 근거</h3>
        <ul className="cd-evidence">
          {match.matchedSkillIds.slice(0, 6).map((id) => (
            <li key={id}><p>{getSkill(id)?.name ?? id}</p><span>{evidence.get(id) ?? '보유 역량 목록에서 확인된 항목입니다.'}</span></li>
          ))}
        </ul>
      </section>

      {match.gapSkillIds.length > 0 && (
        <section className="cd-section">
          <h3>확인이 필요한 필수 역량</h3>
          <div className="cd-gaps">{skillNames(match.gapSkillIds).map((n) => <span key={n}>{n}</span>)}</div>
          <p className="cd-fine">온보딩 {match.onboardingMonths}개월은 학습 난이도 기반 목업 추정치이며 실제 예측값이 아닙니다.</p>
        </section>
      )}

      <section className="cd-section">
        <h3>경험 요약</h3>
        <ul className="cd-highlights">{c.experienceHighlights.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>

      <section className="cd-section cd-stage">
        <label htmlFor="application-stage-v2">전형 상태</label>
        <select id="application-stage-v2" value={match.application.stage} onChange={(e) => onStageChange(e.target.value as ApplicationStage)}>
          {APPLICATION_STAGES.map((s) => <option key={s} value={s}>{APPLICATION_STAGE_LABEL[s]}</option>)}
        </select>
        <p className="cd-fine">화면 확인용 상태이며 새로고침하면 초기화됩니다.</p>
      </section>
    </aside>
  );
}
