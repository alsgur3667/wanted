import Link from 'next/link';
import NaviMark from './NaviMark';

export default function LandingHeader() {
  return (
    <header className="landing-site-header">
      <a href="#landing-main" className="landing-skip">본문 바로가기</a>
      <div className="landing-header-inner">
        <Link href="/" className="landing-brand" aria-label="Career Navi 홈"><NaviMark className="size-7" /><span>Career <b>Navi</b></span></Link>
        {/* 개인·기업은 바로 로그인으로 보낸다.
            아래로 스크롤만 시키면 이미 무엇을 할지 정하고 누른 사람을
            소개 글 앞에 다시 세워 두는 셈이다. 소개는 '추천의 근거'가 맡는다. */}
        <nav aria-label="서비스 안내" className="landing-navigation"><Link href="/login?role=personal">개인 서비스</Link><Link href="/login?role=employer">기업 서비스</Link><a href="#evidence">추천의 근거</a><Link href="/companies">회사·공고</Link></nav>
        <Link href="/login" className="landing-login">데모 시작하기</Link>
      </div>
    </header>
  );
}
