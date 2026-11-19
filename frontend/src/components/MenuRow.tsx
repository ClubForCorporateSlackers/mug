import type { ComponentType } from 'react';
import { ChevronRight } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item';

type Props = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value?: string;
  onClick: () => void;
};

// マイページなどの一覧の1行。shadcn の Item を押せるボタンとして使う
export function MenuRow({ icon: Icon, label, value, onClick }: Props) {
  return (
    <Item asChild className="w-full flex-nowrap gap-3 rounded-none p-3 text-left text-base font-bold">
      <button type="button" onClick={onClick}>
        <ItemMedia className="size-9 rounded-xl bg-secondary">
          <Icon className="size-5" aria-hidden />
        </ItemMedia>
        <ItemContent>{label}</ItemContent>
        <ItemActions className="gap-3">
          {value ? <span className="text-sm text-muted-foreground">{value}</span> : null}
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </ItemActions>
      </button>
    </Item>
  );
}
