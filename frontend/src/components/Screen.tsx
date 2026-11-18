import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  // brand：黄色い地（A1・A4）。plain：クリーム色（そのほか）
  tone?: 'plain' | 'brand';
  // 下のタブがある画面は、その高さの分だけ下をあける
  withTabBar?: boolean;
  className?: string;
};

// 1画面の枠。iPhone の上端（時計・バッテリーの領域）と下端（ホームインジケーター）にかからないよう余白を取る
export function Screen({ children, tone = 'plain', withTabBar = false, className }: Props) {
  return (
    <main
      className={cn(
        'flex min-h-svh flex-col pt-[env(safe-area-inset-top)]',
        tone === 'brand' ? 'bg-brand' : 'bg-background',
        withTabBar ? 'pb-[calc(49px+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {children}
    </main>
  );
}
