import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MenuAction = { id: string; label: string; icon: LucideIcon; danger?: boolean };

type Props = { actions: MenuAction[]; onSelect: (id: string) => void; onCancel: () => void };

// B9・B10 の iOS 風アクションシートの中身
export function ActionMenu({ actions, onSelect, onCancel }: Props) {
  return (
    <div className="flex flex-col gap-2 pb-2">
      <ul className="overflow-hidden rounded-[14px] bg-card">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className={cn(
                  'flex h-14 w-full items-center justify-center gap-2 text-[17px] font-medium',
                  action.danger ? 'text-primary' : 'text-foreground',
                )}
                onClick={() => onSelect(action.id)}
              >
                <Icon className="size-5" aria-hidden />
                {action.label}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="h-14 rounded-[14px] bg-card text-[17px] font-bold text-primary"
        onClick={onCancel}
      >
        キャンセル
      </button>
    </div>
  );
}
