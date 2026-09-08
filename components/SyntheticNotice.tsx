// 가상 데이터임을 알리는 띠.
//
// 전에는 테두리·배경·글씨를 전부 앰버로 칠했다. 그러면 화면에서 제일 센 요소가
// 면책 문구가 된다 — 정작 봐야 할 회사와 공고보다 눈에 먼저 들어온다.
// 색은 '가상'이라는 두 글자에만 남기고 나머지는 회색으로 내린다.
// 안 보이게 하려는 게 아니라, 읽히되 앞서지 않게 하려는 것이다.
export default function SyntheticNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={`rounded-md border border-hairline bg-hairline-soft text-mute ${
        compact ? 'px-3 py-2 text-[11px]' : 'px-4 py-2.5 text-[12px] leading-[1.6]'
      }`}
    >
      <strong className="font-medium text-warning">가상 기업·데모 공고</strong>
      {!compact && ' · 실제 회사나 실제 채용이 아니며, 서비스 흐름을 확인하기 위해 생성한 데이터입니다.'}
    </p>
  );
}
