import { useId } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Option = { value: string; label: string };

type Props = {
  title: string;
  options: Option[];
  selected: string;
  note?: string;
  onChoose: (value: string) => void;
  onClose: () => void;
};

// 下から出る、1つだけ選ぶ一覧。選んだらすぐ onChoose で知らせる。
export function ChoiceSheet({ title, options, selected, note, onChoose, onClose }: Props) {
  const idPrefix = useId();
  return (
    <BottomSheet label={title} onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <Button variant="ghost" size="icon" aria-label="閉じる" onClick={onClose}>
          <X className="size-5" aria-hidden />
        </Button>
      </div>
      {/* onValueChange は今と同じものを選んでも呼ばれないので、onClick で知らせる（今と同じ動き） */}
      <RadioGroup className="mt-2 gap-0 divide-y" aria-label={title} value={selected}>
        {options.map((option, index) => {
          const itemId = `${idPrefix}-${index}`;
          return (
            <Label
              key={option.value}
              htmlFor={itemId}
              className="w-full cursor-pointer py-3 text-base leading-normal font-normal"
            >
              {option.label}
              <RadioGroupItem
                id={itemId}
                value={option.value}
                className="ml-auto size-5"
                onClick={() => onChoose(option.value)}
              />
            </Label>
          );
        })}
      </RadioGroup>
      {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
    </BottomSheet>
  );
}
