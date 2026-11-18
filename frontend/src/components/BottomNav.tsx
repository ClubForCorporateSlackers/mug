import { BookOpen, ChartColumn, Map } from 'lucide-react';
import { cn } from 'cn';
import type { TabName } from '@/lib/route';

const TABS: { id: TabName; label: string; icon: typeof Map }[] = [
  { id: 'map', label: 'マップ', icon: Map },
  { id: 'ranking', label: 'ランキング', icon: ChartColumn },
  { id: 'about', label: '蚊のこと', icon: BookOpen },
];

type Props = {
  tab: TabName;
  onChange: (tab: TabName) => void;
};

export function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-3 border-t bg-card pb-2" aria-label="画面">
      {TABS.map((item) => {
        const Icon = item.icon;
        const on = item.id === tab;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-xs font-bold',
              on ? 'text-primary' : 'text-foreground',
            )}
            aria-current={on ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <Icon className="size-6" aria-hidden />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
