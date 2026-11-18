import { BarChart2, BookOpen, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabName } from '@/lib/route';

const TABS: { id: TabName; label: string; icon: typeof Map }[] = [
  { id: 'map', label: 'マップ', icon: Map },
  { id: 'ranking', label: 'ランキング', icon: BarChart2 },
  { id: 'about', label: '蚊のこと', icon: BookOpen },
];

type Props = { tab: TabName; onChange: (tab: TabName) => void };

// Figma の Tab Bar。画面の下に固定し、iPhone のホームインジケーターの分だけ下をあける。
// ふつうの Safari や PC では安全な領域が 0 になるので、そのときも最低 16px はあける（文字が画面の端に付かないように）。
// 透けない白にする。iPhone の Safari は、画面の下に固定した要素の色で画面の下の領域を塗るため
export function TabBar({ tab, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-[430px] grid-cols-3 border-t-[0.5px] border-border bg-card pb-[max(env(safe-area-inset-bottom),16px)]"
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
