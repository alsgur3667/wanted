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
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-sm leading-relaxed opacity-75">
        {items.map((item) => <li key={item} className="flex gap-2"><span className="opacity-35">•</span><span>{item}</span></li>)}
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
      <Link href={`/companies/${company.id}`} className="text-xs opacity-45 transition hover:opacity-90">← {company.name}</Link>

      <header className="mt-6">
        <div className="flex items-center gap-3">
          <CompanyMark company={company} />
          <div>
            <Link href={`/companies/${company.id}`} className="text-sm font-medium hover:underline">{company.name}</Link>
            <p className="mt-0.5 text-xs opacity-45">{company.industry} · {company.employeeCountRange}</p>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold leading-snug sm:text-3xl">{posting.title}</h1>
        <p className="mt-3 text-sm leading-relaxed opacity-65">{posting.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {[careerLabel(posting), posting.employmentType, WORK_MODE_LABEL[posting.workMode], posting.location, deadlineLabel(posting)].map((label) => (
            <span key={label} className="rounded-full bg-black/[0.05] px-3 py-1.5 dark:bg-white/[0.08]">{label}</span>
          ))}
        </div>
      </header>

      <div className="mt-6"><SyntheticNotice /></div>

      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs opacity-45">연봉</p><p className="mt-1 text-sm font-medium">{posting.salary.display}</p></div>
          <div><p className="text-xs opacity-45">게시일</p><p className="mt-1 text-sm font-medium">{posting.postedAt}</p></div>
        </div>
        <p className="mt-4 border-t border-black/[0.06] pt-3 text-[11px] leading-relaxed opacity-45 dark:border-white/[0.07]">
          표시된 연봉·일정·근무 조건은 화면 검증을 위한 가상 값이며 실제 시장 통계로 사용하지 않습니다.
        </p>
      </section>

      <ListSection title="주요 업무" items={posting.responsibilities} />
      <ListSection title="필수 역량" items={skillNames(posting.mustSkillIds)} />
      <ListSection title="우대 역량" items={skillNames(posting.niceSkillIds)} />
      <ListSection title="지원 제도" items={posting.benefits} />

      <section className="mt-9">
        <h2 className="text-lg font-semibold">채용 절차</h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {posting.hiringProcess.map((step, index) => (
            <li key={step} className="rounded-lg border border-black/10 px-3 py-2 text-xs dark:border-white/10">
              <span className="mr-1.5 opacity-40">{index + 1}</span>{step}
            </li>
          ))}
        </ol>
      </section>

      <div className="sticky bottom-4 mt-12 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-950/95">
        <Link href={`/jobs/${posting.id}/apply`} className="block rounded-xl bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-amber-300">
          데모로 지원 과정 보기
        </Link>
      </div>
    </main>
  );
}
