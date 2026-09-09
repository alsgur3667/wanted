// 출발점 하나에서 두 갈래로 갈라지는 길.
// 지도에서 쓰는 도형을 아이콘 크기로 줄인 것이라 로고와 히어로가 따로 놀지 않는다.
// 갈래 하나가 앰버인 것도 같은 규칙이다 — '몰랐던 길'이 이 제품의 요지다.
export default function NaviMark({ className = 'size-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M5 20 C 5 12, 12 12, 12 4"
        fill="none"
        stroke="var(--link)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 20 C 5 14, 19 15, 19 8"
        fill="none"
        stroke="var(--warning)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="5" cy="20" r="2.6" fill="var(--ink)" />
    </svg>
  );
}
