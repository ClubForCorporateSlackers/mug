import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<'button'> & { icon: LucideIcon; label: string; size?: 'md' | 'lg' };

// 白い丸いボタン（地図の上の「マイページ」「現在地」、ピン詳細の「…」など）
export function RoundButton({ icon: Icon, label, size = 'md', className, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-card text-foreground shadow-floating disabled:text-placeholder',
        size === 'lg' ? 'size-14' : 'size-12',
        className,
      )}
      {...props}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}
