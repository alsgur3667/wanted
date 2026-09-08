import Link from 'next/link';
import { notFound } from 'next/navigation';
import CompanyMark from '@/components/CompanyMark';
import SyntheticNotice from '@/components/SyntheticNotice';
import {
  COMPANIES,
  careerLabel,
  companyById,
  deadlineLabel,
  postingsForCompany,
  STAGE_LABEL,
  WORK_MODE_LABEL,
} from '@/lib/company-index';


export function generateStaticParams() {
  return COMPANIES.map((company) => ({ companyId: company.id }));
}

export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = companyById(companyId);
  if (!company) notFound();
  const postings = postingsForCompany(company.id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Link href="/companies" className="text-xs opacity-45 transition hover:opacity-90">← 회사 목록</Link>
      <header className="mt-6 flex items-start gap-4">
        <CompanyMark company={company} size="lg" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{company.name}</h1>
            <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">가상 기업</span>
          </div>
          <p className="mt-2 text-sm opacity-65">{company.tagline}</p>
        </div>
      </header>

      <div className="mt-6"><SyntheticNotice /></div>

      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">회사 정보</h2>
        <dl className="mt-4 grid grid-cols-[100px_1fr] gap-y-2 text-sm">
          <dt className="opacity-45">산업</dt><dd>{company.industry}</dd>
          <dt className="opacity-45">조직</dt><dd>{company.employeeCountRange} · {STAGE_LABEL[company.stage]}</dd>
          <dt className="opacity-45">설립</dt><dd>{company.foundedYear}년</dd>
          <dt className="opacity-45">근무지</dt><dd>{company.headquarters}</dd>
          <dt className="opacity-45">근무 방식</dt><dd>{company.workModes.map((mode) => WORK_MODE_LABEL[mode]).join(' · ')}</dd>
        </dl>
        <p className="mt-5 text-sm leading-relaxed opacity-70">{company.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {company.tags.map((tag) => <span key={tag} className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs dark:bg-white/[0.08]">{tag}</span>)}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-semibold">일하는 방식</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed opacity-70">
            {company.culture.map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </section>
        <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-semibold">지원 제도</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed opacity-70">
            {company.benefits.map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">채용 중인 포지션 {postings.length}개</h2>
        <div className="mt-4 space-y-3">
          {postings.map((posting) => (
            <Link key={posting.id} href={`/jobs/${posting.id}`} className="block rounded-2xl border border-black/10 p-5 transition hover:border-amber-400/70 dark:border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{posting.title}</h3>
                  <p className="mt-1 text-xs opacity-50">{careerLabel(posting)} · {posting.location} · {WORK_MODE_LABEL[posting.workMode]}</p>
                </div>
                <span className="shrink-0 text-xs opacity-45">{deadlineLabel(posting)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
