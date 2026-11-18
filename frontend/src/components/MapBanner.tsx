import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  icon: LucideIcon;
  children: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'warning' | 'info';
};

// 地図の上に出す白い帯。B3「位置情報がオフ」、B5「地図を動かして…」
export function MapBanner({ icon: Icon, children, actionLabel, onAction, tone = 'info' }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-floating" role="status">
      <Icon className={cn('size-6 shrink-0', tone === 'warning' ? 'text-primary' : 'text-foreground')} aria-hidden />
      <p className="flex-1 text-[15px] leading-[22px] font-medium">{children}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="shrink-0 rounded-full bg-muted px-3 py-2 text-[15px] font-bold text-primary"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
