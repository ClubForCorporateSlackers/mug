import { cn } from 'cn';
import { PIN_STAMPS } from '@/lib/labels';
import type { PinStamp } from '@/lib/types';

type Props = {
  value: PinStamp | null;
  onChange: (value: PinStamp | null) => void;
};

export function StampPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="状況スタンプ">
      {PIN_STAMPS.map((stamp) => {
        const on = value === stamp.value;
        return (
          <button
            key={stamp.value}
            type="button"
            aria-pressed={on}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-bold',
              on ? 'border-foreground bg-foreground text-card' : 'bg-card text-foreground',
            )}
            onClick={() => onChange(on ? null : stamp.value)}
          >
            {stamp.label}
          </button>
        );
      })}
    </div>
  );
}
