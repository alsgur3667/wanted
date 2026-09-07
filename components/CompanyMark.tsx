import type { Company } from '@/types';


export default function CompanyMark({ company, size = 'md' }: { company: Company; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'size-9 text-xs' : size === 'lg' ? 'size-16 text-lg' : 'size-12 text-sm';
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl font-bold text-white shadow-sm ${sizeClass}`}
      style={{ background: `linear-gradient(135deg, ${company.brand.colorFrom}, ${company.brand.colorTo})` }}
    >
      {company.brand.initials}
    </span>
  );
}
