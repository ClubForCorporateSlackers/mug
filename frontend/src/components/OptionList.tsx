import { Check, type LucideIcon } from 'lucide-react';

export type Option = { value: string; label: string; icon?: LucideIcon };

type Props = {
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
  label: string;
};

// 選んだものにチェックが付くリスト（C3 の期間、C4 の都道府県）
export function OptionList({ options, value, onSelect, label }: Props) {
  return (
    <ul className="flex flex-col" role="listbox" aria-label={label}>
      {options.map((option) => {
        const on = option.value === value;
        const Icon = option.icon;
        return (
          <li key={option.value} className="border-b border-border last:border-b-0">
            <button
              type="button"
              role="option"
              aria-selected={on}
              className="flex h-[52px] w-full items-center gap-3 px-1 text-[17px] font-medium"
              onClick={() => onSelect(option.value)}
            >
              {Icon ? (
                <span className="grid size-8 place-items-center rounded-lg bg-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
              ) : null}
              <span className="flex-1 text-left">{option.label}</span>
              {on ? <Check className="size-5 text-primary" aria-hidden /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
