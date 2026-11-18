import { ChevronDown } from 'lucide-react';

type Props = { children: string; onClick: () => void };

// ランキングの「2026年11月 ⌄」「東京都 ⌄」
export function FilterChip({ children, onClick }: Props) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center gap-1 rounded-full bg-muted px-3.5 text-[15px] font-bold"
      onClick={onClick}
    >
      {children}
      <ChevronDown className="size-5" aria-hidden />
    </button>
  );
}
