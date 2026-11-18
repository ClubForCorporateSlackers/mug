import { ChevronRight, type LucideIcon } from 'lucide-react';

type RowProps = { icon: LucideIcon; label: string; value: string; onClick: () => void };

// C3 の「地域 ＞ 都道府県」の行
export function OptionLinkRow({ icon: Icon, label, value, onClick }: RowProps) {
  return (
    <button
      type="button"
      className="flex h-[52px] w-full items-center gap-3 rounded-[14px] bg-card px-3 text-[17px] font-bold"
      onClick={onClick}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex-1 text-left">{label}</span>
      <span className="text-[15px] font-medium text-muted-foreground">{value}</span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </button>
  );
}
