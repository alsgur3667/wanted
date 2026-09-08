import Link from 'next/link';
import { LOW_CONFIDENCE, type JobDetail, type RequirementRow } from '@/lib/job-detail';
import { careerLabel, deadlineLabel, postingsForJob, WORK_MODE_LABEL } from '@/lib/company-index';
import CompanyMark from './CompanyMark';

// ============================================================================
//  "이 직무에 필요한 것" — 추천 경로와 직접 고른 직무가 같은 화면을 쓴다.
//
//  두 칸으로 나눈 이유: 사람은 "무슨 일을 하나"와 "뭘로 하나"를 따로 생각한다.
//  데이터도 그렇게 갈려 있다 (sourceType).
//
//  색은 ink → body → mute → faint 네 단계만 쓴다. 투명도로 위계를 만들지 않는다.
// ============================================================================

function RequirementList({ rows, sampleSize }: { rows: RequirementRow[]; sampleSize: number }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.skillId} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={`mt-[3px] grid size-[15px] shrink-0 place-items-center rounded-full border text-[9px] leading-none ${
              r.held
                ? 'border-link bg-link-soft text-link'
                : r.coveredVia
                  ? 'border-link/35 text-link/60'
                  : 'border-hairline text-transparent'
            }`}
          >
            ✓
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13px] text-ink">{r.name}</span>
              {r.isMust && (
                <span className="rounded-[4px] border border-hairline px-1 py-px text-[10px] text-mute">
                  필수
                </span>
              )}
              <span className="ml-auto shrink-0 text-[11px] tabular-nums text-faint">
                {r.docFreq}/{sampleSize}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-[1.6] text-mute">
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
  const demoPostings = postingsForJob(detail.jobId, 2);

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[13px] font-medium text-ink">이 직무에 필요한 것</h4>
        <span className="text-[11px] text-faint">공고 {detail.sampleSize}건 기준</span>
      </div>

      {/* 표본이 얇은 직무는 요구 역량 자체를 믿기 어렵다 (이슈 #21).
          숫자를 감추는 대신 어느 정도로 믿을 수 있는지 함께 적는다. */}
      {detail.confidence < LOW_CONFIDENCE && (
        <p className="mt-2.5 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[11px] leading-[1.6] text-warning">
          공고 표본이 {detail.sampleSize}건으로 적어, 아래 목록은 한두 회사의 공고에 크게 기울어 있을 수
          있습니다.
        </p>
      )}

      <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-[1.4fr_1fr]">
        {detail.work.length > 0 && (
          <section>
            <h5 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">
              하는 일
            </h5>
            <RequirementList rows={detail.work} sampleSize={detail.sampleSize} />
          </section>
        )}

        {detail.tools.length > 0 && (
          <section
            className={
              detail.work.length > 0 ? 'sm:border-l sm:border-hairline sm:pl-7' : 'sm:col-span-2'
            }
          >
            <h5 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">
              쓰는 도구·기술
            </h5>
            <RequirementList rows={detail.tools} sampleSize={detail.sampleSize} />
          </section>
        )}
      </div>

      {/* ⚠️ 여기 공고는 실제가 아니다. 서비스 흐름을 보이려고 만든 것이다.
          그래서 '가상'이라는 말을 제목 옆과 목록 아래에 두 번 적는다 —
          데이터에만 표시하고 화면에 안 쓰면 보는 사람은 실제로 받아들인다. */}
      {demoPostings.length > 0 && (
        <div className="mt-6 border-t border-hairline pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-[13px] font-medium text-ink">이 직무를 모집 중인 기업</h4>
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
              가상 공고 {demoPostings.length}개
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {demoPostings.map(({ posting, company }) => (
              <Link
                key={posting.id}
                href={`/jobs/${posting.id}`}
                className="flex items-center gap-3 rounded-lg border border-hairline bg-elevated p-3 transition-colors hover:border-mute"
              >
                <CompanyMark company={company} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{posting.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-mute">
                    {company.name} · {careerLabel(posting)} · {WORK_MODE_LABEL[posting.workMode]}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-faint">{deadlineLabel(posting)} →</span>
              </Link>
            ))}
          </div>

          <p className="mt-2.5 text-[11px] leading-[1.6] text-faint">
            실제 채용이 아닌 서비스 시연용 가상 기업·공고입니다. 요구 역량은 실제 공고{' '}
            {detail.sampleSize}건에서 뽑았습니다.
          </p>
        </div>
      )}
    </>
  );
}
