import Link from 'next/link';
import NaviMark from './NaviMark';

export default function LandingHeader() {
  return (
    <header className="landing-site-header">
      <a href="#landing-main" className="landing-skip">본문 바로가기</a>
      <div className="landing-header-inner">
        <Link href="/" className="landing-brand" aria-label="Career Navi 홈"><NaviMark className="size-7" /><span>Career <b>Navi</b></span></Link>
        <nav aria-label="서비스 안내" className="landing-navigation"><a href="#personal">개인 서비스</a><a href="#employer">기업 서비스</a><a href="#evidence">추천의 근거</a><Link href="/companies">회사·공고</Link></nav>
        <Link href="/login" className="landing-login">데모 시작하기</Link>
      </div>
    </header>
  );
}
