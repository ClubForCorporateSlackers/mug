import { BarChart2, BookOpen, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabName } from '@/lib/route';

const TABS: { id: TabName; label: string; icon: typeof Map }[] = [
  { id: 'map', label: 'マップ', icon: Map },
  { id: 'ranking', label: 'ランキング', icon: BarChart2 },
  { id: 'about', label: '蚊のこと', icon: BookOpen },
];

type Props = { tab: TabName; onChange: (tab: TabName) => void };

// Figma の Tab Bar。画面の下に固定し、iPhone のホームインジケーターの分だけ下をあける
export function TabBar({ tab, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-[430px] grid-cols-3 border-t-[0.5px] border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      aria-label="画面の切り替え"
    >
      {TABS.map((item) => {
        const Icon = item.icon;
        const on = item.id === tab;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(
              'flex h-[49px] flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] leading-[14px] font-bold tracking-[0.01em]',
              on ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-current={on ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <Icon className={cn('size-6', on ? 'text-foreground' : 'text-muted-foreground')} aria-hidden />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
