import { Bug, Map, Trophy, UserRound } from 'lucide-react';
import { cn } from 'cn';
import type { TabName } from '@/lib/route';

const TABS: { id: TabName; label: string; icon: typeof Map }[] = [
  { id: 'map', label: '地図', icon: Map },
  { id: 'ranking', label: '順位', icon: Trophy },
  { id: 'about', label: '蚊のこと', icon: Bug },
  { id: 'me', label: '自分', icon: UserRound },
];

type Props = {
  tab: TabName;
  onChange: (tab: TabName) => void;
};

export function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="grid grid-cols-4 border-t bg-card pb-2" aria-label="画面">
      {TABS.map((item) => {
        const Icon = item.icon;
        const on = item.id === tab;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold',
              on ? 'text-foreground' : 'text-muted-foreground',
            )}
            aria-current={on ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
