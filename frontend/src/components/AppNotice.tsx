import { cn } from '@/lib/utils';

type Props = { children: string; tone?: 'info' | 'error'; floating?: boolean };

// 短いお知らせ。floating のときは画面の上に浮かせる（「準備中です」などの一時的な表示）
export function AppNotice({ children, tone = 'info', floating = false }: Props) {
  return (
    <p
      className={cn(
        'rounded-2xl px-4 py-3 text-[15px] leading-[22px] font-medium',
        tone === 'error' ? 'bg-accent text-primary' : 'bg-card text-foreground',
        floating && 'shadow-floating',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
