import type { Route, RouteDifficulty } from '@/types';

const DIFFICULTY_LABEL: Record<RouteDifficulty, string> = {
  easy: '수월함',
  moderate: '보통',
  challenging: '도전적',
};

export default function RouteCard({ route, rank }: { route: Route; rank: number }) {
  return (
    <article
      className={`rounded-2xl border p-5 transition ${
        route.isHiddenRoute
          ? 'border-amber-400/60 bg-amber-400/[0.06]'
          : 'border-black/10 dark:border-white/10'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          {route.isHiddenRoute && (
            <span className="mb-1.5 inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
              이 길도 있어요
            </span>
          )}
          <h3 className="text-lg font-semibold leading-tight">
            <span className="mr-1.5 opacity-40">{rank}</span>
            {route.destination}
          </h3>
          <p className="mt-0.5 text-xs opacity-55">{route.jobFamily}</p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold tabular-nums">{route.fitScore}</div>
          <div className="text-[11px] opacity-55">적합도</div>
        </div>
      </header>

      <p className="mt-3 text-sm leading-relaxed opacity-85">{route.reason}</p>

      <dl className="mt-4 flex gap-5 text-xs">
        <div>
          <dt className="opacity-50">예상 준비</dt>
          <dd className="mt-0.5 font-medium">{route.estimatedMonths}개월</dd>
        </div>
        <div>
          <dt className="opacity-50">난이도</dt>
          <dd className="mt-0.5 font-medium">{DIFFICULTY_LABEL[route.difficulty]}</dd>
        </div>
      </dl>

      <section className="mt-4">
        <h4 className="text-xs font-medium opacity-55">이미 가진 무기</h4>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {route.bridgeSkills.map((s) => (
            <li key={s}
                className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300">
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h4 className="text-xs font-medium opacity-55">채워야 할 것</h4>
        <ul className="mt-2 space-y-2.5">
          {route.gapSkills.map((g) => (
            <li key={g.name}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{g.name}</span>
                <span className="h-1 flex-1 rounded-full bg-black/10 dark:bg-white/10">
                  <span className="block h-full rounded-full bg-rose-400/70"
                        style={{ width: `${Math.round(g.difficulty * 100)}%` }} />
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed opacity-65">{g.firstStep}</p>
            </li>
          ))}
        </ul>
      </section>

      {route.marketNote && (
        <p className="mt-4 border-t border-black/5 pt-3 text-xs opacity-55 dark:border-white/5">
          {route.marketNote}
        </p>
      )}
    </article>
  );
}
