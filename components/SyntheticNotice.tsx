export default function SyntheticNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`rounded-xl border border-dashed border-amber-400/50 bg-amber-400/[0.07] text-amber-900 dark:text-amber-200 ${compact ? 'px-3 py-2 text-[11px]' : 'px-4 py-3 text-xs leading-relaxed'}`}>
      <strong className="font-semibold">가상 기업·데모 공고</strong>
      {!compact && ' · 실제 회사나 실제 채용이 아니며, 서비스 흐름을 확인하기 위해 생성한 데이터입니다.'}
    </p>
  );
}
