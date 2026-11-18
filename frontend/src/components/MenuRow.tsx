import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = { icon: LucideIcon; label: string; value?: string; danger?: boolean; onClick: () => void };

// D1 の設定の行。白いカードの中に並べる（親で rounded とまとめる）
export function MenuRow({ icon: Icon, label, value, danger = false, onClick }: Props) {
  return (
    <button
      type="button"
      className="flex h-[52px] w-full items-center gap-3 border-b border-border bg-card px-4 text-[17px] font-medium last:border-b-0"
      onClick={onClick}
    >
      <span className={cn('grid size-8 place-items-center rounded-lg', danger ? 'bg-accent' : 'bg-brand')}>
        <Icon className={cn('size-5', danger && 'text-primary')} aria-hidden />
      </span>
      <span className={cn('flex-1 text-left', danger && 'text-primary')}>{label}</span>
      {value ? <span className="text-[15px] text-muted-foreground">{value}</span> : null}
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </button>
  );
}
