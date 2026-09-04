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
          {/*  연봉 구간과 직업전망 — 고용24 직업정보의 실제 자료다.
               ⚠️ 액수가 아니라 구간이다. 최상단이 '5천만원 이상' 이라 개발 직무 대부분이
                  같은 칸에 들어간다. 전망을 함께 보여야 직무가 갈려 보인다.  */}
          {(route.salaryBand || route.prospect) && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              {route.salaryBand && (
                <span className="rounded bg-black/[0.06] px-1.5 py-0.5 tabular-nums dark:bg-white/10">
                  연봉 {route.salaryBand}
                </span>
              )}
              {route.prospect && (
                <span
                  className={
                    'rounded px-1.5 py-0.5 ' +
                    (route.prospect.includes('증가')
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : route.prospect.includes('감소')
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        : 'bg-black/[0.06] dark:bg-white/10')
                  }
                >
                  전망 {route.prospect}
                </span>
              )}
              <span className="opacity-40">고용24 직업정보</span>
            </p>
          )}
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

      {/*
        요구 역량 전부를 펼쳐 볼 수 있게 한다.
        "8가지 중 5가지"라는 숫자만 보여주면 무엇이 8개고 무엇을 갖췄는지 확인할 수 없다.
        대체재로 충족한 것은 어느 묶음으로 충족했는지 함께 적는다 —
        iOS 개발자가 Kotlin 을 안 가졌는데 충족으로 나오면 그 이유가 보여야 한다.
      */}
      {route.requirements?.length ? (
        <details className="mt-4 group">
          <summary className="cursor-pointer list-none text-xs font-medium opacity-55 hover:opacity-80">
            요구 역량 {route.requirements.filter((r) => r.tier === 'required').length}가지 전체 보기
            <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-2 space-y-1">
            {route.requirements.map((r) => (
              <li key={`${r.tier}-${r.name}`} className="flex items-baseline gap-2 text-xs">
                <span aria-hidden className={r.met ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-30'}>
                  {r.met ? '✓' : '·'}
                </span>
                <span className={r.met ? 'font-medium' : 'opacity-60'}>{r.name}</span>
                <span className="rounded px-1 py-px text-[10px] opacity-45">
                  {r.tier === 'required' ? '필수' : '우대'}
                </span>
                {r.viaGroup ? (
                  <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
                    {r.viaGroup} 대체 충족
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

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
