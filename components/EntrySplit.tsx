'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { DEMO_ACCOUNTS, ROLES, type Role } from '@/lib/demo-auth';

// ============================================================================
//  개인 / 기업 — 두 입구
//
//  화면을 좌우로 꽉 채운 두 패널로 나눈다. 카드 두 장을 나란히 놓는 것과
//  뭐가 다르냐면, 카드는 '항목'이고 이건 '갈림길'이다. 여기서 한 번 고르면
//  그다음 화면 전체가 달라진다는 걸 크기로 말한다.
//
//  마우스를 올린 쪽이 넓어진다. 고르기 전에 어느 쪽을 보고 있는지가 먼저 보인다.
//
//  ── 사진과 도형을 같이 쓴다
//  사진은 분위기를 세우고, 도형은 구조를 말한다. 둘 중 하나만으로는 부족했다.
//
//    개인  갈림길 앞에서 지도를 보는 사람   /  한 점에서 여러 갈래로 퍼지는 도형
//    기업  건물 사이로 걸어 들어가는 사람들 /  여러 점이 한 곳으로 모이는 도형
//
//  도형을 좌우로 뒤집은 것이 핵심이다. 같은 엔진이 양방향으로 동작한다는 말을
//  글로 쓰기 전에 그림이 먼저 한다.
//
//  ── 마우스를 올리면 사진이 흐려진다
//  혼다가 사진을 뒤로 물리는 것과 같은 원리다. 사진은 "여기가 무엇에 대한
//  곳인가"를 3초 만에 말하고 나면 할 일이 끝난다. 읽을 것이 나타나는 순간
//  뒤로 빠져야 글이 앞에 선다. 흐림과 어두워짐을 같이 걸어야 글자가 확실히 읽힌다.
// ============================================================================

const PANEL: Record<
  Role,
  { title: string; line: string; cta: string; photo: string; alt: string }
> = {
  personal: {
    title: '내가 갈 수 있는\n다음 커리어',
    line: '이력서를 넣으면 도달 가능한 경로를 찾습니다. 그중 하나는 스스로는 떠올리기 어려운 길입니다.',
    cta: '경로 찾기',
    photo: '/entry/personal.webp',
    alt: '갈림길 앞에서 지도 앱을 보며 어느 길로 갈지 살피는 사람들',
  },
  employer: {
    title: '직무명으로는\n보이지 않는 지원자',
    line: '공고를 만들면 역량 기준으로 인재를 정렬합니다. 직함이 달라 검색에 안 잡히던 사람이 드러납니다.',
    cta: '인재 찾기',
    photo: '/entry/employer.webp',
    alt: '오피스 건물 사이 광장을 걸어가는 직장인들',
  },
};

/** 발산(개인) / 수렴(기업). 같은 도형을 방향만 뒤집는다 */
function FlowMark({ role, active }: { role: Role; active: boolean }) {
  const spread = role === 'personal';
  const hub = { x: spread ? 26 : 154, y: 60 };
  const leaves = [
    { x: spread ? 154 : 26, y: 16 },
    { x: spread ? 154 : 26, y: 44 },
    { x: spread ? 154 : 26, y: 76 },
    { x: spread ? 154 : 26, y: 104 },
  ];

  return (
    <svg viewBox="0 0 180 120" className="h-[120px] w-[180px]" aria-hidden>
      <g fill="none" stroke="var(--link)" strokeWidth="1.5" strokeOpacity={active ? 0.75 : 0.35}>
        {leaves.map((p, i) => (
          <path
            key={i}
            d={`M ${hub.x} ${hub.y} C ${(hub.x + p.x) / 2} ${hub.y} ${(hub.x + p.x) / 2} ${p.y} ${p.x} ${p.y}`}
          />
        ))}
      </g>
      {leaves.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3.5"
          fill="var(--link)"
          fillOpacity={active ? 0.85 : 0.4}
        />
      ))}
      <circle cx={hub.x} cy={hub.y} r="7" fill="var(--link)" fillOpacity={active ? 1 : 0.55} />
    </svg>
  );
}

export default function EntrySplit() {
  const [hovered, setHovered] = useState<Role | null>(null);

  return (
    <section aria-label="개인 또는 기업으로 시작하기" className="flex flex-col md:h-[520px] md:flex-row">
      {ROLES.map((role) => {
        const account = DEMO_ACCOUNTS[role];
        const panel = PANEL[role];
        const active = hovered === role;
        const dimmed = hovered !== null && !active;

        return (
          <Link
            key={role}
            href={`/login?role=${role}`}
            onMouseEnter={() => setHovered(role)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(role)}
            onBlur={() => setHovered(null)}
            // flex-grow 를 전환한다. width 를 % 로 주고 바꾸면 두 패널이
            // 각자 계산해 사이가 벌어지거나 겹친다.
            style={{ flexGrow: active ? 1.32 : dimmed ? 0.82 : 1 }}
            className={`group relative flex flex-1 flex-col justify-between overflow-hidden border-hairline p-8 transition-[flex-grow] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:p-12 ${
              role === 'personal' ? 'border-b md:border-b-0 md:border-r' : ''
            }`}
          >
            {/* ── 사진 ──
                next/image 대신 CSS 배경으로 두지 않는 이유: 배경 이미지는
                미리 불러오지 않아 화면에 늦게 뜬다. 첫 화면에 보이는 그림이라
                priority 로 먼저 받는다.

                aria-hidden 은 아니다 — alt 를 준다. 이 사진들은 장식이 아니라
                각 패널이 무엇에 대한 곳인지 말하고 있다. */}
            <Image
              src={panel.photo}
              alt={panel.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className={`object-cover transition-[filter,opacity,transform] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active
                  ? 'scale-105 opacity-25 blur-[7px]'
                  : 'scale-100 opacity-100 blur-0 dark:opacity-75'
              }`}
            />

            {/* ── 덮개 ──
                처음에는 사진 전체에 바탕색을 균일하게 깔았다. 라이트 모드에서
                흰 덮개가 사진을 통째로 씻어내 거의 안 보였다 — 실제로 남는 건
                15% 남짓이었다.

                글은 왼쪽에만 있다. 그러니 덮개도 왼쪽에만 있으면 된다.
                왼→오 그라데이션으로 글이 앉는 쪽만 덮고 오른쪽은 사진을 살린다.
                두 사진 다 오른쪽에 볼 것이 있어서 구도와도 맞는다.

                ⚠️ 알파 값을 라이트/다크로 나눈 이유 — 같은 70% 라도 흰 덮개는
                   사진을 지우고 검은 덮개는 가라앉힐 뿐이다. 눈에 닿는 결과가
                   달라서 한 값으로 둘 다 맞출 수 없다. */}
            <div
              className="absolute inset-0 bg-canvas/20 dark:bg-canvas/45"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-canvas/96 via-canvas/78 to-canvas/15 dark:from-canvas/95 dark:via-canvas/70 dark:to-canvas/10"
              aria-hidden
            />
            {/* 마우스를 올리면 큰 제목이 나온다. 그때는 전면을 덮어야 읽힌다 */}
            <div
              className={`absolute inset-0 transition-opacity duration-[600ms] ${
                active ? 'bg-canvas/75 opacity-100 dark:bg-canvas/80' : 'opacity-0'
              }`}
              aria-hidden
            />
            {/* 아래부터가 글이다. 사진·덮개가 absolute 라 relative 를 줘야 위에 선다 */}
            <div className="relative">
              {/* 역할 이름. 이 패널이 누구 것인지 말하는 유일한 단어라
                  캡션 크기로 두면 못 찾는다 */}
              <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink md:text-[19px]">
                {account.label}
              </span>

              {/* ── 큰 화면: 한 자리를 두 글이 나눠 쓴다 ──
                  가만히 있을 때는 '무엇을 해 주는 곳인가'(설명)가 보이고,
                  마우스를 올리면 그 글이 뒤로 물러나며 '무엇을 얻는가'(제목)가
                  앞으로 나온다.

                  두 글을 위아래로 같이 두지 않는 이유: 고르기 전에 읽어야 할
                  문장이 네 개(패널당 두 개)면 아무것도 안 읽는다. 한 번에 하나만
                  보여주면 마우스를 움직이는 것 자체가 읽는 행위가 된다.

                  ⚠️ 두 글을 같은 그리드 칸에 겹쳐 놓는다. 위치를 absolute 로
                     띄우면 칸 높이가 0이 되어 아래 요소가 올라붙는다.
                     min-height 는 둘 중 긴 쪽에 맞춰 둬야 전환할 때 안 흔들린다. */}
              <div className="mt-4 hidden min-h-[132px] max-w-md grid-cols-1 md:grid">
                <p
                  className={`col-start-1 row-start-1 self-start text-[20px] leading-[1.6] tracking-[-0.02em] text-body transition-all duration-[520ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    active ? 'scale-[0.96] opacity-0 blur-[1px]' : 'scale-100 opacity-100'
                  }`}
                >
                  {panel.line}
                </p>
                <h2
                  aria-hidden={!active}
                  className={`col-start-1 row-start-1 self-start whitespace-pre-line text-[34px] font-bold leading-[1.2] tracking-[-0.04em] text-ink transition-all duration-[520ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    active ? 'scale-100 opacity-100' : 'scale-[1.06] opacity-0 blur-[2px]'
                  }`}
                >
                  {panel.title}
                </h2>
              </div>

              {/* ── 작은 화면: 바꾸지 않는다 ──
                  손가락에는 '올려 두기'가 없다. 터치로는 바뀌는 걸 볼 수 없으니
                  둘 다 그냥 보여준다. */}
              <div className="md:hidden">
                <h2 className="mt-3 whitespace-pre-line text-[26px] font-bold leading-[1.25] tracking-[-0.035em] text-ink">
                  {panel.title}
                </h2>
                <p className="mt-3 text-[14px] leading-[1.7] text-body">{panel.line}</p>
              </div>
            </div>

            <div className="relative mt-10 flex items-end justify-between gap-6">
              <span className="inline-flex items-center gap-2 text-[14px] font-medium text-ink">
                {panel.cta}
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
              {/* 작은 화면에서는 도형을 뺀다. 세로로 쌓이면 글보다 그림이 먼저 와서
                  무슨 화면인지 읽는 순서가 뒤집힌다 */}
              <div className="hidden shrink-0 md:block">
                <FlowMark role={role} active={active} />
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
