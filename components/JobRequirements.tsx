import { LOW_CONFIDENCE, type JobDetail, type RequirementRow } from '@/lib/job-detail';

// ============================================================================
//  "이 직무에 필요한 것" — 추천 경로와 직접 고른 직무가 같은 화면을 쓴다.
//
//  두 칸으로 나눈 이유: 사람은 "무슨 일을 하나"와 "뭘로 하나"를 따로 생각한다.
//  데이터도 그렇게 갈려 있다 (sourceType).
// ============================================================================

function RequirementList({ rows, sampleSize }: { rows: RequirementRow[]; sampleSize: number }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.skillId} className="flex items-start gap-2">
          <span
            aria-hidden
            className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[9px] leading-none ${
              r.held
                ? 'border-emerald-500/70 text-emerald-600 dark:text-emerald-400'
                : r.coveredVia
                  ? 'border-emerald-500/35 text-emerald-600/60 dark:text-emerald-400/60'
                  : 'border-black/20 text-transparent dark:border-white/25'
            }`}
          >
            ✓
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm">{r.name}</span>
              {r.isMust && (
                <span className="rounded bg-black/[0.06] px-1 py-px text-[10px] opacity-60 dark:bg-white/10">
                  필수
                </span>
              )}
              <span className="ml-auto shrink-0 text-[11px] tabular-nums opacity-45">
                {r.docFreq}/{sampleSize}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed opacity-60">
              {r.held
                ? `내 이력서 — "${r.evidence}"`
                : r.coveredVia
                  ? `같은 계열의 다른 것을 갖고 있어요 — ${r.coveredVia}`
                  : `첫 단계 — ${r.firstStep}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function JobRequirements({ detail }: { detail: JobDetail }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium">이 직무에 필요한 것</h4>
        <span className="text-[11px] opacity-45">공고 {detail.sampleSize}건 기준</span>
      </div>

      {/* 표본이 얇은 직무는 요구 역량 자체를 믿기 어렵다 (이슈 #21).
          숫자를 감추는 대신 어느 정도로 믿을 수 있는지 함께 적는다. */}
      {detail.confidence < LOW_CONFIDENCE && (
        <p className="mt-2 rounded-lg border border-dashed border-amber-400/40 px-3 py-2 text-[11px] leading-relaxed opacity-70">
          공고 표본이 {detail.sampleSize}건으로 적어, 아래 목록은 한두 회사의 공고에 크게 기울어 있을 수
          있습니다.
        </p>
      )}

      <div className="mt-3.5 grid gap-x-7 gap-y-5 sm:grid-cols-[1.4fr_1fr]">
        {detail.work.length > 0 && (
          <section>
            <h5 className="mb-2.5 text-xs opacity-45">하는 일</h5>
            <RequirementList rows={detail.work} sampleSize={detail.sampleSize} />
          </section>
        )}

        {detail.tools.length > 0 && (
          <section
            className={
              detail.work.length > 0
                ? 'sm:border-l sm:border-black/[0.07] sm:pl-6 sm:dark:border-white/[0.08]'
                : 'sm:col-span-2'
            }
          >
            <h5 className="mb-2.5 text-xs opacity-45">쓰는 도구·기술</h5>
            <RequirementList rows={detail.tools} sampleSize={detail.sampleSize} />
          </section>
        )}
      </div>

      {/* 회사명은 아직 공고 데이터에 없다. 자리를 먼저 두고 건수만 사실대로 쓴다.
          없는 회사명을 지어 넣으면 나머지 숫자의 신뢰도까지 함께 잃는다. */}
      <div className="mt-5 border-t border-black/[0.07] pt-3.5 dark:border-white/[0.08]">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-medium">이 직무를 모집 중인 기업</h4>
          <span className="text-xs opacity-60">공고 {detail.sampleSize}건</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed opacity-45">
          분석에 쓴 공고 {detail.sampleSize}건에서 뽑은 요구 역량입니다. 회사명과 공고 링크는 준비 중입니다.
        </p>
      </div>
    </>
  );
}
