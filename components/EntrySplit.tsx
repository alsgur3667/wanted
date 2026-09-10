import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Compass, Check } from 'lucide-react';

const entries = [
  { role: 'personal', label: '개인을 위한 Career Navi', icon: Compass, title: '내 경험의 다음 방향을 찾으세요.', description: '이직을 준비하거나 첫 커리어를 고민하고 계신가요? 해 온 일에서 출발해 가능한 경로와 준비할 역량을 살펴보세요.', features: ['이력서·프로젝트 경험으로 역량 분석', '연결 가능한 커리어 경로 비교', '부족한 역량과 다음 준비 확인'], cta: '내 커리어 탐색하기' },
  { role: 'employer', label: '기업을 위한 Career Navi', icon: BriefcaseBusiness, title: '우리 팀에 필요한 역량을 찾으세요.', description: '채용공고 작성부터 지원자 검토까지. 직함이나 키워드만으로 놓치던 인재를 경험과 역량 근거로 검토하세요.', features: ['직접 작성하거나 AI로 공고 초안 만들기', '공고의 요구 역량에 맞는 인재 탐색', '지원자별 근거 검토와 전형 상태 관리'], cta: '기업 채용 공간으로' },
];

export default function EntrySplit() {
  return <section aria-label="개인 또는 기업으로 시작하기" className="site-container py-14 sm:py-20">
    <div className="mb-8"><p className="eyebrow">서로 다른 목표, 각자에게 맞는 시작</p><h2 className="mt-3 text-[28px] font-semibold text-ink">어떤 연결을 찾고 계신가요?</h2></div>
    <div className="grid gap-5 md:grid-cols-2">{entries.map(({ role, label, icon: Icon, title, description, features, cta }) => <article key={role} className={`audience-card ${role === 'employer' ? 'audience-employer' : ''}`}>
      <div className="flex items-center gap-3"><span className="audience-icon"><Icon className="size-5" /></span><p className="text-xs font-semibold text-mute">{label}</p></div>
      <h3 className="mt-6 text-2xl font-semibold leading-snug text-ink">{title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-body">{description}</p>
      <ul className="my-6 space-y-3">{features.map(feature => <li key={feature} className="flex items-start gap-2.5 text-sm text-body"><Check className="mt-0.5 size-4 shrink-0 text-link" />{feature}</li>)}</ul>
      <Link href={`/login?role=${role}`} className={role === 'personal' ? 'action-primary mt-auto self-start' : 'action-secondary mt-auto self-start'}>{cta}<ArrowRight className="size-4" /></Link>
    </article>)}</div>
  </section>;
}
