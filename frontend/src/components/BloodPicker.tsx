import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BLOOD_OPTIONS } from '@/lib/labels';
import type { BloodType } from '@/lib/types';

type Props = { value: BloodType; onChange: (value: BloodType) => void };

export function BloodPicker({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      spacing={2}
      className="flex-wrap"
      aria-label="血液型"
      value={value}
      // 選んでいるものをもう一度押すと空文字が来る。血液型は外せないようにするので無視する
      onValueChange={(next) => {
        if (next) onChange(next as BloodType);
      }}
    >
      {BLOOD_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="h-auto rounded-full border bg-card px-3 py-2 text-sm font-bold hover:bg-card hover:text-inherit data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-card"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
