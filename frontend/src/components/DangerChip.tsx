import { cn } from 'cn';
import { DANGER_LABELS, type DangerLevel } from '@/lib/danger';

type Props = { level: DangerLevel };

// 地図の上のカードに出す、画面の真ん中あたりの危険度
export function DangerChip({ level }: Props) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        level === 'high' && 'bg-primary/15 text-primary',
        level === 'mid' && 'bg-chart-1/30',
        level === 'low' && 'bg-secondary',
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full',
          level === 'high' && 'bg-primary',
          level === 'mid' && 'bg-chart-1',
          level === 'low' && 'bg-chart-4',
        )}
        aria-hidden
      />
      危険度 {DANGER_LABELS[level]}
    </span>
  );
}
