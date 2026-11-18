import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'plain' | 'gray';
type Props = Omit<ComponentProps<typeof Button>, 'variant'> & { tone?: Tone; full?: boolean };

const TONES: Record<Tone, string> = {
  // 赤いカプセル。1画面に1つまで（Figma の Button / Primary）
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  // 赤い文字だけ（Figma の Button / Plain）
  plain: 'bg-transparent text-primary hover:bg-primary/5',
  // 灰色。「取り消す」「キャンセル」など
  gray: 'bg-muted text-foreground hover:bg-muted/80',
};

// Figma の Button。高さ50、カプセル形
export function MugButton({ className, tone = 'primary', full = true, ...props }: Props) {
  return (
    <Button
      className={cn(
        'h-[50px] rounded-full px-5 text-[17px] leading-6 font-bold tracking-[0.01em]',
        TONES[tone],
        full && 'w-full',
        className,
      )}
      {...props}
    />
  );
}
