import type { ComponentType } from 'react';
import { ChevronRight } from 'lucide-react';

type Props = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value?: string;
  onClick: () => void;
};

// マイページなどの一覧の1行
export function MenuRow({ icon: Icon, label, value, onClick }: Props) {
  return (
    <button type="button" className="flex w-full items-center gap-3 px-3 py-3 text-left font-bold" onClick={onClick}>
      <span className="grid size-9 place-items-center rounded-xl bg-secondary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex-1">{label}</span>
      {value ? <span className="text-sm text-muted-foreground">{value}</span> : null}
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </button>
  );
}
