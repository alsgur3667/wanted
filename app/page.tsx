import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Compass, FileText, UsersRound } from 'lucide-react';
import NaviMark from '@/components/NaviMark';
import LandingReveal from '@/components/LandingReveal';
import ScrollFade from '@/components/ScrollFade';
import CountUp from '@/components/CountUp';
import { CORPUS } from '@/lib/corpus-stats';
import './landing.css';

export default function Landing() {
  return (
    <main id="landing-main" className="navi-landing">
      {/* 히어로는 첫 화면에서 할 일이 끝난다. 아래로 내려가면 갈림길을 읽어야
          하는데 사진이 또렷한 채로 따라 내려오면 시선이 둘로 나뉜다.
          초점이 빠지면서 뒤로 눕고 멀어지게 해 "이건 다 봤다"를 몸으로 전한다.

          distance 는 히어로 높이보다 짧게 잡는다. 화면 높이만 한 블록이라
          길게 잡으면 효과가 끝나기 전에 사진이 화면 밖으로 나가 버린다. */}
      <ScrollFade start={40} distance={560} lift={40} tilt={18} depth={260} blur={10}>
      <section className="navi-hero" aria-labelledby="hero-title">
        <Image src="/landing/hero-v2.png" alt="아침 햇살이 비치는 도심에서 다음 일터를 향해 걸어가는 사람" fill preload sizes="100vw" className="navi-hero-image" />
        <div className="navi-hero-shade" />
        <div className="navi-hero-content">
          <p className="navi-hero-label">CAREER NAVI</p>
          <h1 id="hero-title">경험이 쌓인 만큼,<br />가능성은 더 넓게.</h1>
          <p className="navi-hero-description">나의 다음 커리어도, 우리 팀의 다음 동료도.<br />직무명 너머의 역량에서 시작하세요.</p>
          <div className="navi-hero-actions">
            <Link className="navi-button navi-button-white" href="/login?role=personal">개인 · 커리어 찾기<ArrowUpRight size={18} /></Link>
            <Link className="navi-button navi-button-glass" href="/login?role=employer">기업 · 인재 찾기<ArrowUpRight size={18} /></Link>
          </div>
        </div>
        <a href="#personal" className="navi-scroll-cue" aria-label="개인 서비스 알아보기"><span>더 알아보기</span><ArrowDown size={18} /></a>
      </section>
      </ScrollFade>

      <section className="navi-introduction">
        {/* 글에는 사진보다 약하게, 그리고 늦게 건다. 읽는 중에 흐려지면
            방해가 된다. tilt 를 낮게 두는 이유도 같다 — 글줄이 기울면
            읽기가 갑자기 어려워진다.

            start=320 은 눈으로 맞춘 값이다. 180 일 때는 글이 아직 화면
            한가운데 있는데 벌써 흐려지기 시작했다. */}
        <ScrollFade start={320} distance={560} lift={22} tilt={5} depth={110} blur={5}>
        <LandingReveal>
          <p className="navi-overline">직무가 달라도, 경험은 이어지니까</p>
          <h2>해 온 일의 가치를 발견하고,<br />아직 만나지 못한 기회로.</h2>
          <p className="navi-intro-copy">개인에게는 새로운 커리어의 방향을.<br />기업에게는 함께 성장할 인재의 가능성을.<br />Career Navi는 경험 속 역량으로 서로를 연결합니다.</p>
        </LandingReveal>
        </ScrollFade>
      </section>

      <section id="personal" className="navi-personal navi-section-anchor" aria-labelledby="personal-title">
        <div className="navi-content-width">
          <LandingReveal className="navi-editorial-heading">
            <span className="navi-overline">개인을 위한 Career Navi</span>
            <h2 id="personal-title">내 경험으로 갈 수 있는 길,<br />더 넓게 살펴보세요.</h2>
          </LandingReveal>
          <div className="navi-editorial-grid">
            {/* 히어로보다 약하게 건다. 여긴 이미 등장 애니메이션이 있어서,
                퇴장까지 세게 주면 화면이 쉬지 않고 움직인다. */}
            <ScrollFade start={140} distance={640} lift={26} tilt={9} depth={150} blur={6}>
            <LandingReveal className="navi-personal-photo" from="left">
              <Image src="/entry/personal.webp" alt="갈림길 앞에서 지도를 보며 다음 방향을 살펴보는 사람들" fill sizes="(max-width: 800px) 100vw, 58vw" />
              <div className="navi-photo-caption"><Compass size={18} /><span>다음 방향을 찾는 일, 경험에서 시작해 보세요.</span></div>
            </LandingReveal>
            </ScrollFade>
            <ScrollFade start={320} distance={560} lift={22} tilt={5} depth={110} blur={5}>
            <LandingReveal className="navi-editorial-copy" from="right" delay={0.12}>
              <span className="navi-section-number">01 / PERSONAL</span>
              <h3>이력서 한 장에서<br />다음 커리어의 실마리를.</h3>
              <p>이직을 준비하고 계신가요?<br />혹은 첫 커리어를 고민하고 계신가요?<br />어떤 일을 해 봤는지 알려주세요.<br />경험을 활용할 수 있는 직무를 함께 살펴봅니다.</p>
              <ul className="navi-feature-list">
                <li><Check size={17} />이력서·프로젝트 경험으로 역량 분석</li>
                <li><Check size={17} />연결 가능한 커리어 경로와 근거 확인</li>
                <li><Check size={17} />부족한 역량과 다음 준비 살펴보기</li>
              </ul>
              <Link href="/login?role=personal" className="navi-text-link">내 커리어 탐색하기<ArrowRight size={18} /></Link>
              <span className="navi-small-note">완성된 이력서가 없어도 예시로 체험할 수 있어요.</span>
            </LandingReveal>
            </ScrollFade>
          </div>
        </div>
      </section>

      <section id="employer" className="navi-employer navi-section-anchor" aria-labelledby="employer-title">
        <ScrollFade start={160} distance={700} lift={30} tilt={9} depth={165} blur={7}>
        <div className="navi-business-visual">
          <Image src="/entry/employer.webp" alt="오피스 건물 사이로 출근하는 사람들" fill sizes="100vw" />
          <div className="navi-business-shade" />
          <LandingReveal className="navi-business-title">
            <span className="navi-overline">기업을 위한 Career Navi</span>
            <h2 id="employer-title">우리 팀에 필요한 사람,<br />직무명만으로<br className="navi-mobile-break" /> 놓치지 않도록.</h2>
            <p>같은 일을 해 왔어도, 직함은 다를 수 있습니다.<br />지원자의 경험과 역량을 채용 기준에 나란히 놓고 살펴보세요.</p>
            <Link href="/login?role=employer" className="navi-button navi-button-white">기업 채용 시작하기<ArrowUpRight size={18} /></Link>
          </LandingReveal>
        </div>
        </ScrollFade>
        <div className="navi-business-details navi-content-width">
          <div className="navi-business-intro"><span className="navi-section-number">02 / BUSINESS</span><h3>공고를 만드는 순간부터,<br />인재를 검토하는 순간까지.</h3></div>
          <div className="navi-business-steps">
            {[
              { icon: FileText, title: '채용의 기준을 세우고', text: '직접 작성하거나 AI로 초안을 만들며, 공고에 필요한 역할과 역량을 정리합니다.' },
              { icon: Compass, title: '역량으로 인재를 찾고', text: '공고의 요구 역량과 연결되는 인재를 탐색하고, 추천 근거를 확인합니다.' },
              { icon: UsersRound, title: '경험을 보고 검토하세요', text: '지원자별 역량 근거를 살펴보고 다음 전형으로의 진행 상태를 관리합니다.' },
            ].map(({icon: Icon, title, text}, i) => <LandingReveal key={title} className="navi-business-step" delay={i * 0.1}><div className="navi-step-top"><Icon size={24} strokeWidth={1.6} /><span>0{i + 1}</span></div><h4>{title}</h4><p>{text}</p></LandingReveal>)}
          </div>
        </div>
      </section>

      <section id="evidence" className="navi-evidence navi-section-anchor">
        <div className="navi-content-width">
          <ScrollFade start={320} distance={560} lift={22} tilt={5} depth={110} blur={5}>
            <LandingReveal><p className="navi-overline">데이터로 설명하는 연결</p><h2>추천에는,<br />확인할 수 있는 이유가 있어야 하니까.</h2><p className="navi-evidence-copy">채용공고와 직무 데이터에서 요구 역량을 찾고,<br />나의 경험과 어떤 부분이 연결되는지 보여드립니다.</p></LandingReveal>
          </ScrollFade>
          <dl className="navi-statistics">
            {[
              { value: CORPUS.postings, label: '분석한 채용공고', unit: '건' },
              { value: CORPUS.jobs, label: '분석 대상 직무', unit: '개' },
              { value: CORPUS.skills, label: '직무에 연결된 역량', unit: '개' },
              { value: CORPUS.pairs, label: '직무·역량 연결', unit: '쌍' },
            ].map(({value, label, unit}, i) => (
              <LandingReveal key={label} delay={i * 0.09}>
                <dt>{label}</dt>
                {/* ⚠️ 단위에 이름을 준다. CountUp 이 숫자를 <span> 으로 감싸는데,
                    '.navi-statistics dd span' 같은 막연한 선택자를 그대로 두면
                    숫자까지 단위 크기(16px·회색)로 끌려간다. */}
                <dd><CountUp to={value} startOnView delay={260} /><span className="navi-stat-unit">{unit}</span></dd>
              </LandingReveal>
            ))}
          </dl>
          <p className="navi-small-note">수집한 표본 기준이며, 전체 채용시장을 대표하지 않습니다. 추천은 커리어 탐색과 인재 검토를 돕는 참고 정보입니다.</p>
        </div>
      </section>

      <section className="navi-closing">
        <LandingReveal><NaviMark className="navi-closing-mark" /><h2>다음 연결을,<br />지금 시작해 보세요.</h2></LandingReveal>
        <div className="navi-closing-actions"><Link href="/login?role=personal" className="navi-button navi-button-teal">개인 · 내 커리어 찾기<ArrowRight size={18} /></Link><Link href="/login?role=employer" className="navi-button navi-button-dark">기업 · 우리 팀 인재 찾기<ArrowRight size={18} /></Link></div>
        <p className="navi-small-note">회원가입 없이 데모 계정으로 체험할 수 있습니다.</p>
      </section>
      <footer className="navi-footer"><div className="navi-content-width"><div className="navi-footer-top"><Link href="/" className="navi-footer-brand"><NaviMark />Career Navi</Link><nav aria-label="하단 메뉴"><Link href="/login?role=personal">개인 서비스</Link><Link href="/login?role=employer">기업 서비스</Link><Link href="/companies">회사·공고 둘러보기</Link></nav></div><p>회사·공고·지원자는 서비스 체험을 위한 가상 데이터이며, 실제 채용으로 연결되지 않습니다.</p><p className="navi-footer-credit">Career Navi · 원티드 AI Championship 2026</p></div></footer>
    </main>
  );
}
