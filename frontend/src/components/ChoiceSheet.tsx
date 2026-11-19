import { Check, X } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';

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
  return (
    <BottomSheet label={title} onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" className="grid size-9 place-items-center" aria-label="閉じる" onClick={onClose}>
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <ul className="mt-2 divide-y">
        {options.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              className="flex w-full items-center py-3 text-left"
              aria-pressed={selected === option.value}
              onClick={() => onChoose(option.value)}
            >
              {option.label}
              {selected === option.value ? <Check className="ml-auto size-5 text-primary" aria-hidden /> : null}
            </button>
          </li>
        ))}
      </ul>
      {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
    </BottomSheet>
  );
}
