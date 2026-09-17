// ============================================================================
//  app/preview/companies-v2/[companyId]/page.tsx — Career Navi · 2026-09-17
//  회사 상세 리디자인 미리보기. 데이터·탭 구성은 app/companies/[companyId] 와 같다.
//  기존 페이지는 그대로 둔다.
// ============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Briefcase, Building2, Calendar, MapPin, TrendingUp, UsersRound } from 'lucide-react';
import CompanyMarkV2 from '@/components/redesign/CompanyMarkV2';
import RedesignHeader from '@/components/redesign/RedesignHeader';
import RedesignFooter, { CtaBand } from '@/components/redesign/RedesignFooter';
import { COMPANIES, careerLabel, companyById, deadlineLabel, postingsForCompany, STAGE_LABEL, WORK_MODE_LABEL } from '@/lib/company-index';
import '@/app/redesign.css';
import '../../detail-v2.css';

export function generateStaticParams() {
  return COMPANIES.map((company) => ({ companyId: company.id }));
}

export default async function CompanyV2Page({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = companyById(companyId);
  if (!company) notFound();
  const postings = postingsForCompany(company.id);

  return (
    <div className="navi-v2 detail-v2">
      <RedesignHeader active="companies" />
      <main className="v2-main">
        <div className="wrap">
          <Link href="/preview/companies-v2" className="back"><ArrowLeft size={14} aria-hidden />회사 목록</Link>
          <header className="d-hero rv">
            <div className="d-profile">
              <CompanyMarkV2 company={company} size="lg" />
              <div>
                <span className="overline">Meet your next team</span>
                <h1 className="hd">{company.name}</h1>
                <p className="d-tagline">{company.tagline}</p>
              </div>
            </div>
            <ul className="d-meta">
              <li><Building2 size={14} aria-hidden />{company.industry}</li>
              <li><UsersRound size={14} aria-hidden />{company.employeeCountRange}</li>
              <li><MapPin size={14} aria-hidden />{company.headquarters}</li>
              <li><Briefcase size={14} aria-hidden />{company.workModes.map((m) => WORK_MODE_LABEL[m]).join(' · ')}</li>
              <li><TrendingUp size={14} aria-hidden />{STAGE_LABEL[company.stage]}</li>
              <li><Calendar size={14} aria-hidden />{company.foundedYear}년 설립</li>
            </ul>
            <p className="synthetic"><strong>가상 기업·데모 공고</strong> · 실제 회사나 실제 채용이 아니며, 서비스 흐름을 확인하기 위해 생성한 데이터입니다.</p>
          </header>

          <div className="d-layout">
            <div className="d-body">
              <section className="d-section rv rv-2" id="positions">
                <div className="sec-head-inline"><span className="num">01</span><span className="rule" /><div><span className="overline">Open positions</span><h2 className="hd">함께할 동료를 찾고 있어요. <b>{postings.length}</b></h2></div></div>
                <div className="d-jobs">
                  {postings.map((p) => (
                    <Link key={p.id} href={`/preview/jobs-v2/${p.id}`} className="d-job">
                      <div><h3>{p.title}</h3><p>{careerLabel(p)} · {p.location} · {WORK_MODE_LABEL[p.workMode]}</p></div>
                      <span className="d-job-side"><span className="badge">{deadlineLabel(p)}</span><ArrowRight size={16} aria-hidden /></span>
                    </Link>
                  ))}
                  {!postings.length && <p className="d-empty">현재 공개된 채용 공고가 없습니다.</p>}
                </div>
              </section>

              <section className="d-section rv rv-3" id="about">
                <div className="sec-head-inline"><span className="num">02</span><span className="rule" /><div><span className="overline">About</span><h2 className="hd">이런 팀입니다.</h2></div></div>
                <p className="d-copy">{company.description}</p>
                <div className="d-tags">{company.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </section>

              <section className="d-section rv rv-4" id="culture">
                <div className="sec-head-inline"><span className="num">03</span><span className="rule" /><div><span className="overline">Work &amp; life</span><h2 className="hd">함께 일하는 방식</h2></div></div>
                <ol className="d-values">{company.culture.map((t, i) => <li key={t}><span className="num">{String(i + 1).padStart(2, '0')}</span><p>{t}</p></li>)}</ol>
                <h3 className="d-sub">일과 성장을 위한 지원</h3>
                <div className="d-tags">{company.benefits.map((t) => <span key={t}>{t}</span>)}</div>
              </section>
            </div>

            <aside className="d-side rv rv-2">
              <div className="d-facts">
                <span className="overline">At a glance</span>
                <h2 className="hd">회사 한눈에 보기</h2>
                <dl>
                  <div><dt>산업</dt><dd>{company.industry}</dd></div>
                  <div><dt>조직 규모</dt><dd>{company.employeeCountRange}</dd></div>
                  <div><dt>성장 단계</dt><dd>{STAGE_LABEL[company.stage]}</dd></div>
                  <div><dt>설립</dt><dd>{company.foundedYear}년</dd></div>
                  <div><dt>근무지</dt><dd>{company.headquarters}</dd></div>
                  <div><dt>근무 방식</dt><dd>{company.workModes.map((m) => WORK_MODE_LABEL[m]).join(' · ')}</dd></div>
                </dl>
                <a href="#positions" className="btn btn-dark">채용 중인 공고 {postings.length}개 보기</a>
              </div>
            </aside>
          </div>
        </div>
        <CtaBand title="나의 경험과 맞는 회사인지 확인해보세요." action="나의 커리어 경로 찾기" href="/preview/personal-v2" />
      </main>
      <RedesignFooter />
    </div>
  );
}
