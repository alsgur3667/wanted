import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, MapPin, BriefcaseBusiness, Building2 } from 'lucide-react';
import CompanyMark from '@/components/CompanyMark';
import SyntheticNotice from '@/components/SyntheticNotice';
import { JOB_POSTINGS, careerLabel, companyById, deadlineLabel, postingById, skillNames, WORK_MODE_LABEL } from '@/lib/company-index';
import './posting.css';

export function generateStaticParams() {
  return JOB_POSTINGS.map(posting => ({ postingId: posting.id }));
}

function ListSection({ id, title, items, number }: { id: string; title: string; items: string[]; number: string }) {
  return <section id={id} className="posting-section">
    <p className="posting-eyebrow">{number}</p><h2>{title}</h2>
    {items.length ? <ul className="posting-bullets">{items.map(item => <li key={item}>{item}</li>)}</ul> : <p className="posting-empty">별도로 기재된 내용이 없습니다.</p>}
  </section>;
}

export default async function JobPostingPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params;
  const posting = postingById(postingId);
  if (!posting) notFound();
  const company = companyById(posting.companyId);
  if (!company) notFound();
  const applyUrl = `/jobs/${posting.id}/apply`;
  const required = skillNames(posting.mustSkillIds);
  const preferred = skillNames(posting.niceSkillIds);

  return <main className="posting-page">
    <Link href={`/companies/${company.id}`} className="posting-back"><ArrowLeft size={14} aria-hidden />{company.name}의 채용공고</Link>
    <header className="posting-hero">
      <div className="posting-company"><CompanyMark company={company} /><div><Link href={`/companies/${company.id}`}>{company.name}<ArrowRight size={13} aria-hidden /></Link><p>{company.industry} · {company.employeeCountRange}</p></div><span className="posting-demo-badge">데모 공고</span></div>
      <h1>{posting.title}</h1>
      <p className="posting-summary">{posting.summary}</p>
      <ul className="posting-meta">
        <li><MapPin size={15} aria-hidden />{posting.location}</li>
        <li><BriefcaseBusiness size={15} aria-hidden />{careerLabel(posting)} · {posting.employmentType}</li>
        <li><Building2 size={15} aria-hidden />{WORK_MODE_LABEL[posting.workMode]}</li>
      </ul>
    </header>
    <div className="posting-notice"><SyntheticNotice /></div>
    <div className="posting-layout">
      <div className="posting-body">
        <nav className="posting-nav" aria-label="공고 상세 바로가기"><a href="#posting-work">주요 업무</a><a href="#posting-skills">요구 역량</a><a href="#posting-benefits">지원 제도</a><a href="#posting-process">채용 절차</a></nav>
        <ListSection id="posting-work" title="함께하게 될 일" items={posting.responsibilities} number="01 · RESPONSIBILITIES" />
        <section id="posting-skills" className="posting-section">
          <p className="posting-eyebrow">02 · SKILLS</p><h2>이런 역량을 찾고 있어요</h2>
          <div className="posting-skill-group"><h3>필수 역량 <span>{required.length}</span></h3><p>이 직무를 수행하기 위해 공고에서 요구하는 역량입니다.</p><ul>{required.map(name => <li key={name}>{name}</li>)}</ul>{!required.length && <p>별도로 기재된 필수 역량이 없습니다.</p>}</div>
          <div className="posting-skill-group is-preferred"><h3>우대 역량 <span>{preferred.length}</span></h3><p>함께 갖추고 있다면 도움이 되는 역량입니다.</p><ul>{preferred.map(name => <li key={name}>{name}</li>)}</ul>{!preferred.length && <p>별도로 기재된 우대 역량이 없습니다.</p>}</div>
        </section>
        <ListSection id="posting-benefits" title="일에 집중할 수 있도록" items={posting.benefits} number="03 · BENEFITS" />
        <section id="posting-process" className="posting-section"><p className="posting-eyebrow">04 · PROCESS</p><h2>이런 순서로 만나요</h2><ol className="posting-process">{posting.hiringProcess.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></section>
        <Link className="posting-company-card" href={`/companies/${company.id}`}><CompanyMark company={company} /><div><strong>{company.name} 더 알아보기</strong><p>회사 소개와 다른 채용공고를 확인하세요.</p></div><ArrowRight size={18} aria-hidden /></Link>
      </div>
      <aside className="posting-apply" aria-label="근무 조건과 지원 안내">
        <p className="posting-eyebrow">AT A GLANCE</p><h2>지원 전 확인하세요</h2>
        <dl><div><dt>경력</dt><dd>{careerLabel(posting)}</dd></div><div><dt>고용 형태</dt><dd>{posting.employmentType}</dd></div><div><dt>근무 방식</dt><dd>{WORK_MODE_LABEL[posting.workMode]}</dd></div><div><dt>연봉</dt><dd>{posting.salary.display}</dd></div><div><dt>마감</dt><dd>{deadlineLabel(posting)}</dd></div><div><dt>게시일</dt><dd>{posting.postedAt}</dd></div></dl>
        <Link className="posting-apply-button" href={applyUrl}>데모로 지원 과정 보기<ArrowRight size={16} aria-hidden /></Link>
        <p className="posting-apply-note">실제 입사지원이 아닌 데모입니다. 연봉·일정·근무 조건은 화면 검증을 위한 가상 값입니다.</p>
      </aside>
    </div>
    <div className="posting-mobile-apply"><span>가상 기업 · 데모 공고</span><Link href={applyUrl}>지원 과정 보기<ArrowRight size={16} aria-hidden /></Link></div>
  </main>;
}
