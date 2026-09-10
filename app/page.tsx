import Link from 'next/link';
import { ArrowRight, Compass, ScanSearch, ChartNoAxesCombined } from 'lucide-react';
import EntrySplit from '@/components/EntrySplit';
import HeroCareerMap from '@/components/HeroCareerMap';
import { CORPUS } from '@/lib/corpus-stats';

const benefits = [
  { icon: Compass, title: '연결되는 경험', description: '직함이 달라도 활용할 수 있는 역량을 찾습니다.' },
  { icon: ScanSearch, title: '확인할 수 있는 근거', description: '보유 역량과 요구 역량을 나란히 비교합니다.' },
  { icon: ChartNoAxesCombined, title: '다음 행동의 실마리', description: '개인은 준비할 역량을, 기업은 검토할 근거를 확인합니다.' },
];

export default function Landing() {
  return (
    <main id="main-content">
      <section className="landing-hero border-b border-hairline">
        <div className="site-container grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div>
            <p className="eyebrow"><span className="size-1.5 rounded-full bg-link" />역량으로 연결하는 커리어 플랫폼</p>
            <h1 className="mt-6 text-[38px] font-semibold leading-[1.25] text-ink sm:text-[52px] xl:text-[58px]">지금의 경험에서,<br /><span className="text-link">다음의 가능성으로.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-[1.9] text-body">개인에게는 경험을 이어갈 커리어 경로를.<br />기업에게는 직무명 너머의 역량 있는 인재를.<br />Career Navi에서 다음 연결을 찾아보세요.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?role=personal" className="action-primary">개인 · 내 커리어 찾기 <ArrowRight className="size-4" /></Link>
              <Link href="/login?role=employer" className="action-secondary">기업 · 채용 시작하기 <ArrowRight className="size-4" /></Link>
            </div>
            <p className="mt-4 text-xs leading-6 text-mute">데모 계정으로 체험할 수 있습니다. 회원가입은 필요하지 않습니다.</p>
          </div>
          <div className="map-preview overflow-hidden rounded-3xl border border-hairline bg-elevated">
            <div className="flex items-center justify-between gap-2 border-b border-hairline px-6 py-4"><span className="flex items-center gap-2 text-sm font-semibold text-ink"><Compass className="size-4 text-link" />경험이 연결되는 방식</span><span className="shrink-0 rounded-full bg-link-soft px-2.5 py-1 text-[11px] text-link">경로 예시</span></div>
            <HeroCareerMap className="w-full" />
            <div className="mx-6 mb-5 border-t border-hairline pt-4 text-xs leading-6 text-mute">하나의 경험도 여러 직무로 이어질 수 있습니다.<br />보유 역량과 채용공고의 요구 역량을 비교해 연결합니다.</div>
          </div>
        </div>
      </section>
      <EntrySplit />
      <section className="border-y border-hairline bg-elevated py-14 sm:py-20">
        <div className="site-container">
          <p className="eyebrow">추천의 근거</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-2 lg:gap-20">
            <div><h2 className="text-3xl font-semibold leading-snug text-ink">가능성을 제안하고,<br />그 이유까지 보여드립니다.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-body">어떤 역량이 연결되는지, 무엇을 보완해야 하는지 확인하세요. 수집한 채용공고와 직무 데이터를 바탕으로 판단에 필요한 근거를 제공합니다.</p></div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-7">
              {[[CORPUS.postings, '분석한 채용공고'], [CORPUS.jobs, '분석 대상 직무'], [CORPUS.skills, '역량 항목'], [CORPUS.pairs, '직무·역량 연결']].map(([value, label]) => <div key={label} className="border-b border-hairline pb-4"><dt className="text-xs text-mute">{label}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums text-ink">{value.toLocaleString()}</dd></div>)}
            </dl>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">{benefits.map(({icon: Icon, title, description}) => <div key={title} className="border-t border-hairline pt-5"><Icon className="size-5 text-link" /><h3 className="mt-4 text-base font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-7 text-mute">{description}</p></div>)}</div>
        </div>
      </section>
      <footer className="site-container flex flex-col justify-between gap-4 py-8 text-xs leading-6 text-mute sm:flex-row"><span className="font-semibold text-ink">Career Navi</span><p>회사·공고·지원자는 가상 데이터입니다. 실제 채용으로 연결되지 않습니다.</p><Link href="/companies" className="text-link hover:underline">회사·공고 둘러보기 →</Link></footer>
    </main>
  );
}
