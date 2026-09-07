import type { Route, Skill } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';

// ============================================================================
//  "왜 이 순서인가요"
//
//  카드마다 이유를 적는 대신 셋을 나란히 놓아 순위가 스스로 설명되게 한다.
//  맨 아랫줄이 fitScore 의 가중치 3:1 이 어디서 왔는지까지 푼다.
// ============================================================================

function Bar({ n, total, strong }: { n: number; total: number; strong?: boolean }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="text-xs tabular-nums opacity-70">
        {n} / {total}
      </div>
      <div className="mt-1 h-[3px] rounded-full bg-black/[0.08] dark:bg-white/[0.12]">
        <div
          className={`h-full rounded-full ${strong ? 'bg-emerald-500/70' : 'bg-black/25 dark:bg-white/30'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RankingTable({
  routes,
  mySkills,
}: {
  routes: Route[];
  mySkills: Skill[];
}) {
  // 직무명이 온톨로지와 어긋난 경로가 하나 있다고 표 전체를 지우지 않는다.
  // 그 줄만 커버율을 비우고 적합도는 그대로 보여준다.
  const rows = routes.map((r) => ({ route: r, detail: jobDetailOf(r.destination, mySkills) }));
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <h3 className="text-sm font-medium">왜 이 순서인가요</h3>

      <div className="mt-3.5 grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_52px] gap-3 border-b border-black/[0.07] pb-2 text-[11px] opacity-45 dark:border-white/[0.08]">
        <div>직무</div>
        <div>필수 역량</div>
        <div>우대 역량</div>
        <div className="text-right">적합도</div>
      </div>

      {rows.map(({ route, detail }, i) => (
        <div
          key={route.id}
          className={`grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_52px] items-center gap-3 py-2.5 ${
            i < rows.length - 1 ? 'border-b border-black/[0.07] dark:border-white/[0.08]' : ''
          }`}
        >
          <div className="truncate text-sm">{route.destination}</div>
          {detail ? (
            <>
              <Bar n={detail.mustHeld} total={detail.mustTotal} strong />
              <Bar n={detail.niceHeld} total={detail.niceTotal} />
            </>
          ) : (
            <>
              <div className="text-xs opacity-30">—</div>
              <div className="text-xs opacity-30">—</div>
            </>
          )}
          <div className="text-right text-sm font-semibold tabular-nums">{route.fitScore}</div>
        </div>
      ))}

      <p className="mt-3 border-t border-black/[0.07] pt-3 text-xs leading-relaxed opacity-60 dark:border-white/[0.08]">
        필수 역량은 3배로 셉니다 — 채용공고가 자격요건에 적어둔 것이라서요.
      </p>
    </section>
  );
}
