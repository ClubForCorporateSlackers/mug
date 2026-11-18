import { Droplet, Zap } from 'lucide-react';
import { cn } from 'cn';
import { PIN_STAMPS } from '@/lib/labels';
import type { PinStamp } from '@/lib/types';

const ICONS: Record<PinStamp, typeof Droplet> = { kayui: Droplet, itai: Zap };

type Props = {
  value: PinStamp | null;
  onChange: (value: PinStamp | null) => void;
};

export function StampPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-4" role="group" aria-label="スタンプ">
      {PIN_STAMPS.map((stamp) => {
        const on = value === stamp.value;
        const Icon = ICONS[stamp.value];
        return (
          <button
            key={stamp.value}
            type="button"
            aria-pressed={on}
            className="flex flex-col items-center gap-1 text-xs font-bold"
            onClick={() => onChange(on ? null : stamp.value)}
          >
            <span
              className={cn(
                'grid size-14 place-items-center rounded-full bg-secondary',
                on && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
              )}
            >
              <Icon className="size-6" aria-hidden />
            </span>
            {stamp.label}
          </button>
        );
      })}
    </div>
  );
}
