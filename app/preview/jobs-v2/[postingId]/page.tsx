// ============================================================================
//  app/preview/jobs-v2/[postingId]/page.tsx — Career Navi · 2026-09-17
//  공고 상세 리디자인 미리보기. 데이터·섹션 구성은 app/jobs/[postingId] 와 같다.
// ============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, MapPin } from 'lucide-react';
import CompanyMarkV2 from '@/components/redesign/CompanyMarkV2';
import RedesignHeader from '@/components/redesign/RedesignHeader';
import RedesignFooter from '@/components/redesign/RedesignFooter';
import { JOB_POSTINGS, careerLabel, companyById, deadlineLabel, postingById, skillNames, WORK_MODE_LABEL } from '@/lib/company-index';
import '@/app/redesign.css';
import '../../detail-v2.css';

export function generateStaticParams() {
  return JOB_POSTINGS.map((posting) => ({ postingId: posting.id }));
}

function NumberedSection({ id, n, eyebrow, title, children }: { id: string; n: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="d-section">
      <div className="sec-head-inline"><span className="num">{n}</span><span className="rule" /><div><span className="overline">{eyebrow}</span><h2 className="hd">{title}</h2></div></div>
      {children}
    </section>
  );
}

export default async function JobV2Page({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params;
  const posting = postingById(postingId);
  if (!posting) notFound();
  const company = companyById(posting.companyId);
  if (!company) notFound();
  const applyUrl = `/preview/jobs-v2/${posting.id}/apply`;
  const required = skillNames(posting.mustSkillIds);
  const preferred = skillNames(posting.niceSkillIds);

  return (
    <div className="navi-v2 detail-v2">
      <RedesignHeader active="companies" />
      <main className="v2-main">
        <div className="wrap">
          <Link href={`/preview/companies-v2/${company.id}`} className="back"><ArrowLeft size={14} aria-hidden />{company.name}의 채용공고</Link>
          <header className="d-hero rv">
            <div className="d-company-line">
              <CompanyMarkV2 company={company} size="sm" />
              <Link href={`/preview/companies-v2/${company.id}`}>{company.name}<ArrowRight size={12} aria-hidden /></Link>
              <span>{company.industry} · {company.employeeCountRange}</span>
              <span className="badge">데모 공고</span>
            </div>
            <h1 className="hd">{posting.title}</h1>
            <p className="d-tagline">{posting.summary}</p>
            <ul className="d-meta">
              <li><MapPin size={14} aria-hidden />{posting.location}</li>
              <li><BriefcaseBusiness size={14} aria-hidden />{careerLabel(posting)} · {posting.employmentType}</li>
              <li><Building2 size={14} aria-hidden />{WORK_MODE_LABEL[posting.workMode]}</li>
            </ul>
          </header>

          <div className="d-layout">
            <div className="d-body">
              <nav className="d-nav" aria-label="공고 상세 바로가기"><a href="#work">주요 업무</a><a href="#skills">요구 역량</a><a href="#benefits">지원 제도</a><a href="#process">채용 절차</a></nav>

              <NumberedSection id="work" n="01" eyebrow="Responsibilities" title="함께하게 될 일">
                {posting.responsibilities.length ? <ul className="d-bullets">{posting.responsibilities.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="d-empty">별도로 기재된 내용이 없습니다.</p>}
              </NumberedSection>

              <NumberedSection id="skills" n="02" eyebrow="Skills" title="이런 역량을 찾고 있어요">
                <div className="d-skills">
                  <div className="d-skill-group is-must">
                    <h3>필수 역량 <b>{required.length}</b></h3>
                    <p>이 직무를 수행하기 위해 공고에서 요구하는 역량입니다.</p>
                    <ul>{required.map((n) => <li key={n}>{n}</li>)}</ul>
                    {!required.length && <p className="d-empty">별도로 기재된 필수 역량이 없습니다.</p>}
                  </div>
                  <div className="d-skill-group">
                    <h3>우대 역량 <b>{preferred.length}</b></h3>
                    <p>함께 갖추고 있다면 도움이 되는 역량입니다.</p>
                    <ul>{preferred.map((n) => <li key={n}>{n}</li>)}</ul>
                    {!preferred.length && <p className="d-empty">별도로 기재된 우대 역량이 없습니다.</p>}
                  </div>
                </div>
              </NumberedSection>

              <NumberedSection id="benefits" n="03" eyebrow="Benefits" title="일에 집중할 수 있도록">
                {posting.benefits.length ? <div className="d-tags">{posting.benefits.map((t) => <span key={t}>{t}</span>)}</div> : <p className="d-empty">별도로 기재된 내용이 없습니다.</p>}
              </NumberedSection>

              <NumberedSection id="process" n="04" eyebrow="Process" title="이런 순서로 만나요">
                <ol className="d-values">{posting.hiringProcess.map((step, i) => <li key={`${i}-${step}`}><span className="num">{String(i + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
              </NumberedSection>

              <Link href={`/preview/companies-v2/${company.id}`} className="d-company-card">
                <CompanyMarkV2 company={company} />
                <div><strong>{company.name} 더 알아보기</strong><p>회사 소개와 다른 채용공고를 확인하세요.</p></div>
                <ArrowRight size={18} aria-hidden />
              </Link>
            </div>

            <aside className="d-side rv rv-2">
              <div className="d-facts">
                <span className="overline">At a glance</span>
                <h2 className="hd">지원 전 확인하세요</h2>
                <dl>
                  <div><dt>경력</dt><dd>{careerLabel(posting)}</dd></div>
                  <div><dt>고용 형태</dt><dd>{posting.employmentType}</dd></div>
                  <div><dt>근무 방식</dt><dd>{WORK_MODE_LABEL[posting.workMode]}</dd></div>
                  <div><dt>연봉</dt><dd>{posting.salary.display}</dd></div>
                  <div><dt>마감</dt><dd>{deadlineLabel(posting)}</dd></div>
                  <div><dt>게시일</dt><dd>{posting.postedAt}</dd></div>
                </dl>
                <Link className="btn btn-dark" href={applyUrl}>데모로 지원 과정 보기 <ArrowRight size={16} aria-hidden /></Link>
                <p className="d-note">실제 입사지원이 아닌 데모입니다. 연봉·일정·근무 조건은 화면 검증을 위한 가상 값입니다.</p>
              </div>
            </aside>
          </div>
        </div>
        <div className="d-mobile-bar"><span>가상 기업 · 데모 공고</span><Link href={applyUrl} className="btn btn-dark btn-sm">지원 과정 보기 <ArrowRight size={14} aria-hidden /></Link></div>
      </main>
      <RedesignFooter />
    </div>
  );
}
