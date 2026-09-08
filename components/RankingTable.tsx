import type { Route, Skill } from '@/types';
import { jobDetailOf } from '@/lib/job-detail';

// ============================================================================
//  "왜 이 순서인가요"
//
//  카드마다 이유를 적는 대신 셋을 나란히 놓아 순위가 스스로 설명되게 한다.
//
//  적합도 숫자는 한때 뺐다가 다시 넣었다(이슈 #28).
//    뺀 이유 — fitScore 에 표본 신뢰도·직무 구조 보정이 섞여 있어 1위가 46 으로 나왔다.
//              화면에 보이는 것은 커버율 둘뿐이라 그 숫자로 순서를 설명할 수 없었다.
//    되돌린 이유 — 보정을 evidenceScore 로 분리해 화면 값과 정렬 기준이 같아졌다.
//              이제 이 숫자가 곧 순서다.
//
//  커버율은 route.requirements 를 그대로 센다. 화면이 따로 세면 점수와 어긋난다.
// ============================================================================

function Bar({ n, total, strong }: { n: number; total: number; strong?: boolean }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="text-[12px] tabular-nums text-body">
        {n} / {total}
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-hairline">
        <div
          className={`h-full rounded-full ${strong ? 'bg-ink' : 'bg-faint'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const COLS = 'grid-cols-[20px_minmax(0,1.3fr)_1fr_1fr_44px]';

export default function RankingTable({
  routes,
  mySkills,
}: {
  routes: Route[];
  mySkills: Skill[];
}) {
  // 직무명이 온톨로지와 어긋난 경로가 하나 있다고 표 전체를 지우지 않는다.
  // 그 줄만 커버율을 비운다.
  const rows = routes.map((r) => ({ route: r, detail: jobDetailOf(r.destination, mySkills, r.requirements) }));
  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-hairline bg-elevated px-5 py-4">
      <h3 className="text-[13px] font-medium text-ink">왜 이 순서인가요</h3>

      <div
        className={`mt-4 grid ${COLS} gap-3 border-b border-hairline pb-2 text-[11px] uppercase tracking-wider text-faint`}
      >
        <div />
        <div>직무</div>
        <div>필수 역량</div>
        <div>우대 역량</div>
        <div className="text-right">적합도</div>
      </div>

      {rows.map(({ route, detail }, i) => (
        <div
          key={route.id}
          className={`grid ${COLS} items-center gap-3 py-3 ${
            i < rows.length - 1 ? 'border-b border-hairline' : ''
          }`}
        >
          <div className="text-[12px] tabular-nums text-faint">{i + 1}</div>
          <div className="truncate text-[13px] text-ink">{route.destination}</div>
          {detail ? (
            <>
              <Bar n={detail.mustHeld} total={detail.mustTotal} strong />
              <Bar n={detail.niceHeld} total={detail.niceTotal} />
            </>
          ) : (
            <>
              <div className="text-[12px] text-faint">—</div>
              <div className="text-[12px] text-faint">—</div>
            </>
          )}
          <div className="text-right text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
            {route.fitScore}
          </div>
        </div>
      ))}

      <p className="mt-4 border-t border-hairline pt-3 text-[12px] leading-[1.6] text-mute">
        필수 역량은 3배로 셉니다 — 채용공고가 자격요건에 적어둔 것이라서요. 가진 역량이 그 직무를 얼마나
        설명하는지도 함께 봅니다.
      </p>
    </section>
  );
}
