import type { ComponentType } from 'react';
import { Switch } from '@/components/ui/switch';

type Props = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

// マイページなどの一覧で、オン・オフを切り替える1行
export function SwitchRow({ icon: Icon, label, note, checked, disabled = false, onChange }: Props) {
  return (
    <label className="flex w-full items-center gap-3 px-3 py-3 font-bold">
      <span className="grid size-9 place-items-center rounded-xl bg-secondary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col">
        {label}
        {note ? <span className="text-xs font-medium text-muted-foreground">{note}</span> : null}
      </span>
      <Switch
        className="scale-125"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </label>
  );
}
