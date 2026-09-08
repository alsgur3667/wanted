import Link from 'next/link';
import { notFound } from 'next/navigation';
import CompanyMark from '@/components/CompanyMark';
import SyntheticNotice from '@/components/SyntheticNotice';
import {
  JOB_POSTINGS,
  careerLabel,
  companyById,
  deadlineLabel,
  postingById,
  skillNames,
  WORK_MODE_LABEL,
} from '@/lib/company-index';

export function generateStaticParams() {
  return JOB_POSTINGS.map((posting) => ({ postingId: posting.id }));
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-9">
      <h2 className="text-lg font-semibold tracking-[-0.025em] text-ink">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-[13px] leading-[1.7] text-body">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-faint">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function JobPostingPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params;
  const posting = postingById(postingId);
  if (!posting) notFound();
  const company = companyById(posting.companyId);
  if (!company) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Link
        href={`/companies/${company.id}`}
        className="text-[12px] text-faint transition-colors hover:text-ink"
      >
        ← {company.name}
      </Link>

      <header className="mt-6">
        <div className="flex items-center gap-3">
          <CompanyMark company={company} />
          <div>
            <Link
              href={`/companies/${company.id}`}
              className="text-[13px] font-medium text-ink hover:underline"
            >
              {company.name}
            </Link>
            <p className="mt-0.5 text-[12px] text-faint">
              {company.industry} · {company.employeeCountRange}
            </p>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold leading-snug tracking-[-0.03em] text-ink sm:text-3xl">
          {posting.title}
        </h1>
        <p className="mt-3 text-[13px] leading-[1.7] text-body">{posting.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
          {[
            careerLabel(posting),
            posting.employmentType,
            WORK_MODE_LABEL[posting.workMode],
            posting.location,
            deadlineLabel(posting),
          ].map((label) => (
            <span key={label} className="rounded-full bg-hairline-soft px-3 py-1.5 text-mute">
              {label}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-6">
        <SyntheticNotice />
      </div>

      <section className="mt-8 rounded-xl border border-hairline bg-elevated p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-faint">연봉</p>
            <p className="mt-1 text-[13px] font-medium text-ink">{posting.salary.display}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-faint">게시일</p>
            <p className="mt-1 text-[13px] font-medium text-ink">{posting.postedAt}</p>
          </div>
        </div>
        <p className="mt-4 border-t border-hairline pt-3 text-[11px] leading-[1.6] text-faint">
          표시된 연봉·일정·근무 조건은 화면 검증을 위한 가상 값이며 실제 시장 통계로 사용하지 않습니다.
        </p>
      </section>

      <ListSection title="주요 업무" items={posting.responsibilities} />
      <ListSection title="필수 역량" items={skillNames(posting.mustSkillIds)} />
      <ListSection title="우대 역량" items={skillNames(posting.niceSkillIds)} />
      <ListSection title="지원 제도" items={posting.benefits} />

      <section className="mt-9">
        <h2 className="text-lg font-semibold tracking-[-0.025em] text-ink">채용 절차</h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {posting.hiringProcess.map((step, index) => (
            <li key={step} className="rounded-md border border-hairline px-3 py-2 text-[12px] text-body">
              <span className="mr-1.5 tabular-nums text-faint">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <div className="sticky bottom-4 mt-12 rounded-xl border border-hairline bg-elevated/95 p-3 backdrop-blur">
        <Link
          href={`/jobs/${posting.id}/apply`}
          className="block rounded-md bg-ink px-5 py-3 text-center text-[13px] font-semibold text-elevated transition-opacity hover:opacity-85"
        >
          데모로 지원 과정 보기
        </Link>
      </div>
    </main>
  );
}
