// ============================================================================
//  CompanyMarkV2.tsx — Career Navi · 2026-09-17
//  회사 이니셜 마크. 기존 CompanyMark 는 회사마다 다른 그라디언트를 썼는데,
//  목록에서 색이 제각각이라 카드보다 마크가 먼저 읽혔다. 원형 + 3색 순환으로 통일.
// ============================================================================

import type { Company } from '@/types';

const MARK_COLORS = ['var(--mark-navy)', 'var(--mark-tan)', 'var(--mark-slate)'];

/** 회사 id 를 3색 중 하나에 안정적으로 대응시킨다 — 새로고침해도 색이 바뀌지 않는다. */
export function markColor(company: Pick<Company, 'id'>) {
  let h = 0;
  for (const ch of company.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MARK_COLORS[h % MARK_COLORS.length];
}

export default function CompanyMarkV2({ company, size = 'md' }: { company: Company; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'sm' ? 36 : size === 'lg' ? 72 : 48;
  return (
    <span className="avatar" aria-hidden style={{ background: markColor(company), width: px, height: px, fontSize: size === 'lg' ? 22 : size === 'sm' ? 12 : 15 }}>
      {company.brand.initials}
    </span>
  );
}
