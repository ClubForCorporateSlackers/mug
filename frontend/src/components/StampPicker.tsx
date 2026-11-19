import { Droplet, Zap } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PIN_STAMPS } from '@/lib/labels';
import type { PinStamp } from '@/lib/types';

const ICONS: Record<PinStamp, typeof Droplet> = { kayui: Droplet, itai: Zap };

type Props = {
  value: PinStamp | null;
  onChange: (value: PinStamp | null) => void;
};

export function StampPicker({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      spacing={4}
      aria-label="スタンプ"
      value={value ?? ''}
      // 選んでいるものをもう一度押すと空文字が来るので、「選んでいない」(null) にする
      onValueChange={(next) => onChange(next ? (next as PinStamp) : null)}
    >
      {PIN_STAMPS.map((stamp) => {
        const Icon = ICONS[stamp.value];
        return (
          <ToggleGroupItem
            key={stamp.value}
            value={stamp.value}
            className="group h-auto flex-col gap-1 p-0 text-xs font-bold hover:bg-transparent hover:text-inherit data-[state=on]:bg-transparent data-[state=on]:text-inherit"
          >
            <span className="grid size-14 place-items-center rounded-full bg-secondary group-data-[state=on]:ring-2 group-data-[state=on]:ring-primary group-data-[state=on]:ring-offset-2 group-data-[state=on]:ring-offset-card">
              <Icon className="size-6" aria-hidden />
            </span>
            {stamp.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
