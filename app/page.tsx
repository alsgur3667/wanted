import Link from 'next/link';

// 랜딩 — 개인/기업 두 갈래.
// 클릭 전에 서비스가 이해되도록 카드 안에서 결과를 미리 보여준다.
// 첫 화면에서 '양방향'이 읽히는 것이 이 구조의 목적이다.

function Card({
  href, tag, title, lines, sample, accent,
}: {
  href: string; tag: string; title: string; lines: string; sample: React.ReactNode; accent: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border p-6 transition hover:-translate-y-0.5 ${
        accent
          ? 'border-amber-400/50 bg-amber-400/[0.05] hover:border-amber-400'
          : 'border-black/10 hover:border-black/25 dark:border-white/12 dark:hover:border-white/30'
      }`}
    >
      <span className="text-xs font-medium opacity-50">{tag}</span>
      <h2 className="mt-2 text-xl font-bold leading-snug">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed opacity-65">{lines}</p>

      <div className="mt-5 flex-1 rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">{sample}</div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
        시작하기
        <span className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-5 py-14">
      <header>
        <p className="text-xs font-medium tracking-wide opacity-50">커리어 내비</p>
        <h1 className="mt-2.5 text-3xl font-bold leading-snug sm:text-4xl">
          직무명이 아니라 <span className="text-amber-500 dark:text-amber-400">역량</span>으로
          <br />
          연결합니다.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-65">
          같은 일을 해 왔지만 직함이 달라 서로를 못 찾는 경우가 많습니다.
          공공 직업 데이터를 기반으로 가진 역량을 해석해, 양쪽에서 놓치던 연결을 찾아냅니다.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card
          href="/personal"
          tag="개인"
          title={'내가 갈 수 있는\n다음 커리어'}
          lines="이력서를 넣으면 도달 가능한 경로 3개를 보여줍니다. 그중 하나는 스스로는 떠올리기 어려운 길입니다."
          accent={false}
          sample={
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between"><span className="opacity-60">프로덕트 매니저</span><span className="font-semibold tabular-nums">84</span></li>
              <li className="flex items-center justify-between"><span className="opacity-60">데이터 분석가</span><span className="font-semibold tabular-nums">76</span></li>
              <li className="flex items-center justify-between rounded-md bg-amber-400/15 px-2 py-1">
                <span className="font-medium text-amber-700 dark:text-amber-300">고객 성공 매니저</span>
                <span className="font-semibold tabular-nums">71</span>
              </li>
              <li className="pt-0.5 text-[11px] opacity-45">↑ 몰랐던 경로</li>
            </ul>
          }
        />

        <Card
          href="/employer"
          tag="기업"
          title={'직무명으로는\n보이지 않는 지원자'}
          lines="채용 직무를 고르면 역량 기준으로 지원자를 정렬합니다. 직함이 달라 검색에 안 잡히던 사람이 드러납니다."
          accent
          sample={
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between"><span className="opacity-60">프로덕트 매니저 3년차</span><span className="font-semibold tabular-nums">73</span></li>
              <li className="flex items-center justify-between rounded-md bg-amber-400/15 px-2 py-1">
                <span className="font-medium text-amber-700 dark:text-amber-300">IT QA 엔지니어</span>
                <span className="font-semibold tabular-nums">56</span>
              </li>
              <li className="flex items-center justify-between rounded-md bg-amber-400/15 px-2 py-1">
                <span className="font-medium text-amber-700 dark:text-amber-300">그로스 마케터</span>
                <span className="font-semibold tabular-nums">54</span>
              </li>
              <li className="pt-0.5 text-[11px] opacity-45">↑ 직무명 검색으로는 놓치는 후보</li>
            </ul>
          }
        />
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed opacity-45">
        같은 역량 매칭 엔진이 양방향으로 동작합니다 · 원티드 AI Championship 2026
      </p>
    </main>
  );
}
