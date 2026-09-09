import Link from 'next/link';

// 랜딩 — 개인/기업 두 갈래.
// 클릭 전에 서비스가 이해되도록 카드 안에서 결과를 미리 보여준다.
// 첫 화면에서 '양방향'이 읽히는 것이 이 구조의 목적이다.

// 두 카드는 같은 무게다. 개인이든 기업이든 같은 엔진의 두 입구일 뿐이라
// 한쪽만 색 테두리를 두르면 "기업 쪽이 본편"이라는 잘못된 신호가 된다.
//
// 가만히 있을 때 이 화면은 흑백이다. 색은 마우스를 올린 카드에만 켜진다 —
// '예시로 바로 보기' 버튼과 같은 규칙이라 처음 보는 사람도 두 번째에는 안다.
function Card({
  href, tag, title, lines, sample,
}: {
  href: string; tag: string; title: string; lines: string; sample: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-hairline bg-elevated p-6 transition-colors hover:border-link/50 hover:bg-link-soft"
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-faint">{tag}</span>
      <h2 className="mt-2 whitespace-pre-line text-xl font-bold leading-snug tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <p className="mt-2 text-[13px] leading-[1.6] text-body">{lines}</p>

      {/* 안쪽 판은 호버 때 배경을 비운다. 그대로 두면 카드에 깔린 청록 위로
          회색 판이 떠서 색이 카드 가장자리에만 걸린 것처럼 보인다. */}
      <div className="mt-5 flex-1 rounded-lg border border-hairline bg-canvas p-4 transition-colors group-hover:border-link/20 group-hover:bg-transparent">
        {sample}
      </div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
        시작하기
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

// 샘플 한 줄. 놓치던 항목은 배경 박스가 아니라 왼쪽 세로 막대 하나로 표시한다.
// 막대는 평소 회색이고 카드에 마우스를 올렸을 때만 청록으로 켜진다 —
// 랜딩에서 앰버를 쓰면 아직 아무 맥락도 없는 사람에게 경고처럼 읽힌다.
function Row({ name, score, hidden = false }: { name: string; score: number; hidden?: boolean }) {
  return (
    <li
      className={`flex items-center justify-between py-0.5 ${
        hidden ? 'border-l-2 border-mute pl-2 transition-colors group-hover:border-link' : 'pl-[10px]'
      }`}
    >
      <span className={hidden ? 'font-medium text-ink' : 'text-mute'}>{name}</span>
      <span className="font-semibold tabular-nums text-ink">{score}</span>
    </li>
  );
}

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-5 py-14">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-wider text-faint">커리어 내비</p>
        <h1 className="mt-2.5 text-3xl font-bold leading-snug tracking-[-0.04em] text-ink sm:text-4xl">
          직무명이 아니라 <span className="text-link">역량</span>으로
          <br />
          연결합니다.
        </h1>
        <p className="mt-4 max-w-xl text-[13px] leading-[1.7] text-body">
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
          sample={
            <ul className="space-y-1.5 text-[12px]">
              <Row name="프로덕트 매니저" score={84} />
              <Row name="데이터 분석가" score={76} />
              <Row name="고객 성공 매니저" score={71} hidden />
              <li className="pl-[10px] pt-1 text-[11px] text-faint">↑ 몰랐던 경로</li>
            </ul>
          }
        />

        <Card
          href="/employer"
          tag="기업"
          title={'직무명으로는\n보이지 않는 지원자'}
          lines="채용 직무를 고르면 역량 기준으로 지원자를 정렬합니다. 직함이 달라 검색에 안 잡히던 사람이 드러납니다."
          sample={
            <ul className="space-y-1.5 text-[12px]">
              <Row name="프로덕트 매니저 3년차" score={73} />
              <Row name="IT QA 엔지니어" score={56} hidden />
              <Row name="그로스 마케터" score={54} hidden />
              <li className="pl-[10px] pt-1 text-[11px] text-faint">↑ 직무명 검색으로는 놓치는 후보</li>
            </ul>
          }
        />
      </div>

      <Link
        href="/companies"
        className="group mt-4 flex items-center justify-between rounded-xl border border-dashed border-hairline px-5 py-4 transition-colors hover:border-link/50 hover:bg-link-soft"
      >
        <span>
          <span className="block text-[13px] font-medium text-ink">가상 회사·채용공고 둘러보기</span>
          <span className="mt-1 block text-[12px] text-mute">
            18개 회사와 48개 데모 공고에서 회사 정보와 지원 흐름을 확인합니다.
          </span>
        </span>
        <span className="ml-4 text-mute transition-transform group-hover:translate-x-0.5">→</span>
      </Link>

      <p className="mt-8 text-center text-[12px] leading-[1.6] text-faint">
        같은 역량 매칭 엔진이 양방향으로 동작합니다 · 원티드 AI Championship 2026
      </p>
    </main>
  );
}
