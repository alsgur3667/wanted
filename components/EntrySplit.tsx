'use client';

import { useState } from 'react';
import Link from 'next/link';
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
//  ── 그림에 대하여
//  사진을 쓰지 않는다. 쓸 만한 사진이 없기도 하고, 우리가 파는 것이 분위기가
//  아니라 구조이기 때문이다. 대신 같은 도형 언어를 좌우로 뒤집어 쓴다.
//
//    개인  한 점에서 여러 갈래로 퍼진다   — 나는 어디로 갈 수 있나
//    기업  여러 점이 한 곳으로 모인다     — 이 자리에 누가 맞나
//
//  같은 엔진이 양방향으로 동작한다는 말을 글로 쓰기 전에 그림이 먼저 한다.
// ============================================================================

const PANEL: Record<Role, { title: string; line: string; cta: string }> = {
  personal: {
    title: '내가 갈 수 있는\n다음 커리어',
    line: '이력서를 넣으면 도달 가능한 경로를 찾습니다. 그중 하나는 스스로는 떠올리기 어려운 길입니다.',
    cta: '경로 찾기',
  },
  employer: {
    title: '직무명으로는\n보이지 않는 지원자',
    line: '공고를 만들면 역량 기준으로 인재를 정렬합니다. 직함이 달라 검색에 안 잡히던 사람이 드러납니다.',
    cta: '인재 찾기',
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
            className={`group relative flex flex-1 flex-col justify-between overflow-hidden border-hairline p-8 transition-[flex-grow,background-color] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:p-12 ${
              role === 'personal' ? 'border-b md:border-b-0 md:border-r' : ''
            } ${active ? 'bg-link-soft' : 'bg-elevated'}`}
          >
            <div>
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

            <div className="mt-10 flex items-end justify-between gap-6">
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
