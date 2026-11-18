import { cn } from '@/lib/utils';
import { BLOOD_OPTIONS } from '@/lib/labels';
import type { BloodType } from '@/lib/types';

type Props = { value: BloodType | null; onChange: (value: BloodType) => void };

// 血液型の選択。選んだものは赤い枠と淡い赤の地
export function BloodPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="血液型">
      {BLOOD_OPTIONS.map((option) => {
        const on = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={cn(
              'h-11 rounded-xl text-[15px] leading-[22px] font-bold tracking-[0.01em] whitespace-nowrap',
              // 「答えない」は4文字あるので、狭いカードでも1行に収まるよう小さくする
              option.value === 'UNKNOWN' && 'text-[13px] tracking-normal',
              on ? 'border-2 border-primary bg-accent text-primary' : 'bg-muted text-foreground',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.value === 'UNKNOWN' ? '答えない' : option.value}
          </button>
        );
      })}
    </div>
  );
}
