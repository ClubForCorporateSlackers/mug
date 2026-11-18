import { cn } from '@/lib/utils';

type Props<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// iOS 風の切り替え（ランキングの種類）
export function SegmentedControl<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="flex rounded-[10px] bg-muted p-0.5" role="tablist" aria-label={label}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={cn(
              'h-8 flex-1 rounded-[8px] text-[15px] font-bold',
              on ? 'bg-card shadow-floating' : 'text-muted-foreground',
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
