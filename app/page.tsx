import Link from 'next/link';
import EntrySplit from '@/components/EntrySplit';
import HeroCareerMap from '@/components/HeroCareerMap';
import NaviMark from '@/components/NaviMark';
import CorpusPanel from '@/components/CorpusPanel';
import ScrollFade from '@/components/ScrollFade';

// ============================================================================
//  랜딩
//
//    1  히어로 — 지도 위에 경로가 그려진다
//    2  갈림길 — 개인 / 기업
//    3  둘러보기 — 로그인 없이 볼 수 있는 곳
//
//  히어로를 먼저 두는 이유는 이 제품이 무엇인지가 이름만으로는 안 서기
//  때문이다. '커리어 내비'는 들으면 그럴듯하지만 뭘 하는지는 모른다.
//  경로가 그려지는 걸 3초 보고 나면 그다음 갈림길이 이해된다.
// ============================================================================

export default function Landing() {
  return (
    <main>
      {/* ── 1. 히어로 ── */}
      <section className="relative overflow-hidden border-b border-hairline">
        {/* ── 폭 ──
            max-w-6xl(1152px) 고정을 걷어낸다. 창을 최대화해도 그 폭 그대로라
            좌우로 400px 넘게 남았고, 창을 키울수록 여백만 커졌다.
            이제 창 폭을 따라가고 아주 넓은 화면에서만 상한이 걸린다.

            ── 두 열 ──
            왼쪽에 글과 지도를 세로로 쌓고, 남는 오른쪽을 데이터 규모 패널이
            채운다. 1280px 아래에서는 한 열로 돌아간다 — 좁은 화면에서 옆에
            붙이면 지도가 손톱만 해진다. */}
        <div className="mx-auto max-w-[1800px] px-5 pt-16 sm:px-8 sm:pt-24 xl:px-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-14">
            <div>
              {/* 이름이 먼저다.
                  심사에서 "프로젝트 이름이 안 보여 찾는 데 오래 걸렸다"는 말을 들었다.
                  화면을 처음 본 사람이 3초 안에 답해야 하는 질문은 '무슨 기능인가'가
                  아니라 '이게 뭐라고 불리는가'다. 그래서 제품명을 제일 큰 글씨로 올리고,
                  하던 말(직무명이 아니라 역량으로)은 그 아래 부제로 내렸다.

                  ⚠️ 부제의 '역량'에 있던 청록을 뺐다. 이름의 'Navi'가 이미 청록이라
                     한 화면에 강조가 둘이면 어느 쪽도 강조가 아니게 된다. */}
              <div className="max-w-2xl">
                <p className="animate-fade text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
                  원티드 AI Championship 2026
                </p>

                <h1
                  className="animate-rise mt-4 flex items-center gap-3 text-[40px] font-bold leading-[1.05] tracking-[-0.05em] text-ink sm:gap-4 sm:text-[64px]"
                  style={{ animationDelay: '80ms' }}
                >
                  <NaviMark className="size-[38px] shrink-0 sm:size-[58px]" />
                  <span>
                    Career <span className="text-link">Navi</span>
                  </span>
                </h1>

                <p
                  className="animate-rise mt-5 text-[19px] font-semibold leading-[1.4] tracking-[-0.03em] text-ink sm:text-[26px]"
                  style={{ animationDelay: '160ms' }}
                >
                  직무명이 아니라 역량으로 연결합니다.
                </p>

                <p
                  className="animate-rise mt-4 max-w-xl text-[14px] leading-[1.75] text-body sm:text-[15px]"
                  style={{ animationDelay: '240ms' }}
                >
                  같은 일을 해 왔지만 직함이 달라 서로를 못 찾는 경우가 많습니다. 공공 직업 데이터를
                  기반으로 가진 역량을 해석해, 양쪽에서 놓치던 연결을 찾아냅니다.
                </p>
              </div>

              {/* 지도는 아래로 잘려 나간다. 화면 밖으로 이어지는 것처럼 보여야
                  '여기가 전부가 아니다'라는 느낌이 남는다.
                  4.5초마다 다른 다섯 갈래를 그린다 — HeroCareerMap 참고.
                  스크롤을 내리면 뒤로 누우며 멀어진다 — ScrollFade 참고. */}
              <ScrollFade className="-mx-5 mt-10 sm:-mx-8 sm:mt-14 xl:mx-0">
                <HeroCareerMap className="w-full" />
              </ScrollFade>
            </div>

            {/* 오른쪽 열. 좁은 화면에서는 지도 아래로 내려온다 */}
            <CorpusPanel />
          </div>
        </div>
      </section>

      {/* ── 2. 갈림길 ── */}
      <EntrySplit />

      {/* ── 3. 로그인 없이 둘러보기 ── */}
      <section className="border-t border-hairline bg-canvas">
        <div className="mx-auto max-w-[1800px] px-5 py-10 sm:px-8 xl:px-14">
          <Link
            href="/companies"
            className="group flex items-center justify-between gap-4 rounded-xl border border-dashed border-hairline bg-elevated px-5 py-4 transition-colors hover:border-link/50 hover:bg-link-soft"
          >
            <span>
              <span className="block text-[13px] font-medium text-ink">
                가상 회사·채용공고 둘러보기
              </span>
              <span className="mt-1 block text-[12px] text-mute">
                로그인 없이 18개 회사와 48개 데모 공고에서 회사 정보와 지원 흐름을 확인합니다.
              </span>
            </span>
            <span
              className="shrink-0 text-mute transition-transform group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </Link>

          <p className="mt-8 text-center text-[12px] leading-[1.7] text-faint">
            같은 역량 매칭 엔진이 양방향으로 동작합니다 · 회사·공고·지원자는 모두 가상 데이터입니다
          </p>
        </div>
      </section>
    </main>
  );
}
