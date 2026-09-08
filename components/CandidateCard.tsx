import { isNewcomer, type CandidateMatch } from '@/types';

export default function CandidateCard({
  match,
  rank,
  requiredSkills,
  isDifferentRole,
}: {
  match: CandidateMatch;
  rank: number;
  requiredSkills: string[];
  isDifferentRole: boolean;
}) {
  const { candidate: c, fitScore, matchedSkills, gapSkills, onboardingMonths } = match;
  const matchedRequiredCount = matchedSkills.filter((s) => requiredSkills.includes(s)).length;

  return (
    <article
      className={`rounded-xl border p-5 ${
        isDifferentRole ? 'border-warning/45' : 'border-hairline'
      }`}
    >
      <header className="flex items-start gap-4">
        <div className="w-12 shrink-0 text-center">
          <div className="text-2xl font-bold tabular-nums leading-none">{fitScore}</div>
          <div className="mt-1 text-[10px] text-faint">적합도</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-faint tabular-nums">{rank}</span>
            <h3 className="font-semibold">{c.alias}</h3>
            {isDifferentRole && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                직무 전환 후보
              </span>
            )}
            {isNewcomer(c.careerMonths) && (
              <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-300">
                신입
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-body">
            {c.currentJobTitle}
            {!isNewcomer(c.careerMonths) && ` · ${Math.floor(c.careerMonths / 12)}년차`}
            {c.industry && ` · ${c.industry}`}
          </p>
        </div>
      </header>

      <div className="mt-4 pl-16">
        <div>
          <h4 className="text-xs font-medium text-faint">보유</h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {matchedSkills.map((s) => (
              <li key={s} className="rounded-md border border-link/30 bg-link-soft px-2.5 py-1 text-[12px] text-link">
                {s}
              </li>
            ))}
          </ul>
        </div>

        {gapSkills.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium text-faint">
              부족 <span className="text-body">· 예상 온보딩 {onboardingMonths}개월</span>
            </h4>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {gapSkills.map((g) => (
                <li key={g.name} className="rounded-full bg-rose-500/12 px-2.5 py-1 text-xs text-rose-700 dark:text-rose-300">
                  {g.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isDifferentRole && (
          <p className="mt-3 border-t border-hairline pt-2.5 text-[12px] leading-[1.6] text-body">
            직무명은 <strong className="font-medium text-ink">{c.currentJobTitle}</strong>지만, 필수 역량{' '}
            {matchedRequiredCount}개를 이미 보유하고 있습니다. 직무명으로 검색하면 노출되지 않는 후보입니다.
          </p>
        )}
      </div>
    </article>
  );
}
