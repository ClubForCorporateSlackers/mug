import { Frown, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PIN_STAMPS } from '@/lib/labels';
import type { PinStamp } from '@/lib/types';

const ICONS: Record<PinStamp, LucideIcon> = { kayui: Frown, itai: Zap };

type Props = { value: PinStamp | null; onChange: (value: PinStamp | null) => void };

// ピンに付けるスタンプ（かゆい・いたい）。もう一度押すと外れる
export function StampPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-6" role="group" aria-label="スタンプ">
      {PIN_STAMPS.map((stamp) => {
        const on = value === stamp.value;
        const Icon = ICONS[stamp.value];
        return (
          <button
            key={stamp.value}
            type="button"
            aria-pressed={on}
            className="flex w-14 flex-col items-center gap-1.5 text-xs leading-4 font-medium"
            onClick={() => onChange(on ? null : stamp.value)}
          >
            <span
              className={cn(
                'grid size-14 place-items-center rounded-full bg-brand text-foreground',
                on && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
              )}
            >
              <Icon className="size-7" aria-hidden />
            </span>
            {stamp.label}
          </button>
        );
      })}
    </div>
  );
}
