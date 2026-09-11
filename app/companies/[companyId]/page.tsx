import '../companies.css';
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

return <main className="company-page">
<Link href="/companies" className="company-back">← 회사 목록</Link>
<header className="company-hero"><p className="company-eyebrow">MEET YOUR NEXT TEAM</p><div className="company-profile"><CompanyMark company={company} size="lg"/><div><h1>{company.name}</h1><p>{company.tagline}</p></div></div></header><SyntheticNotice/>
<nav className="company-nav" aria-label="회사 상세 안내"><a href="#about">회사 소개</a><a href="#culture">일하는 환경</a><a href="#positions">채용 공고 {postings.length}</a></nav>
<div className="company-body"><div>
<section id="about" className="company-section"><p className="company-eyebrow">01 · ABOUT</p><h2>이런 팀입니다.</h2><p>{company.description}</p><div className="company-tags">{company.tags.map(t=><span key={t}>{t}</span>)}</div></section>
<section id="culture" className="company-section"><p className="company-eyebrow">02 · WORK & LIFE</p><h2>함께 일하는 방식</h2><ul className="company-values">{company.culture.map((t,i)=><li key={t}><b>{String(i+1).padStart(2,'0')}</b>{t}</li>)}</ul></section>
<section className="company-section"><h2>일과 성장을 위한 지원</h2><div className="company-tags">{company.benefits.map(t=><span key={t}>{t}</span>)}</div></section>
<section id="positions" className="company-section"><p className="company-eyebrow">03 · OPEN POSITIONS</p><h2>함께할 동료를 찾고 있어요. <span className="text-link">{postings.length}</span></h2>{postings.map(p=><Link className="company-job" key={p.id} href={'/jobs/'+p.id}><div><h3>{p.title}</h3><p>{careerLabel(p)} · {p.location} · {WORK_MODE_LABEL[p.workMode]}</p></div><span>{deadlineLabel(p)} →</span></Link>)}{!postings.length&&<p>현재 공개된 채용 공고가 없습니다.</p>}</section>
</div><aside className="company-facts"><h2>회사 한눈에 보기</h2><dl><dt>산업</dt><dd>{company.industry}</dd><dt>조직 규모</dt><dd>{company.employeeCountRange}</dd><dt>성장 단계</dt><dd>{STAGE_LABEL[company.stage]}</dd><dt>설립</dt><dd>{company.foundedYear}년</dd><dt>근무지</dt><dd>{company.headquarters}</dd><dt>근무 방식</dt><dd>{company.workModes.map(m=>WORK_MODE_LABEL[m]).join(' · ')}</dd></dl><a className="company-cta" href="#positions">채용 공고 {postings.length}개 보기</a></aside></div></main>;
}