import { cn } from 'cn';
import { BLOOD_OPTIONS } from '@/lib/labels';
import type { BloodType } from '@/lib/types';

type Props = { value: BloodType; onChange: (value: BloodType) => void };

export function BloodPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="血液型">
      {BLOOD_OPTIONS.map((option) => {
        const on = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={cn(
              'rounded-full border px-3 py-2 text-sm font-bold',
              on ? 'border-foreground bg-foreground text-card' : 'bg-card',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
