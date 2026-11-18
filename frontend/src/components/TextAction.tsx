import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<'button'> & { strong?: boolean };

// 赤い文字のボタン（ナビの「保存」「キャンセル」、シートの「閉じる」「完了」など）
export function TextAction({ className, strong = false, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'h-11 text-[17px] leading-[26px] text-primary disabled:opacity-50',
        strong ? 'font-bold' : 'font-medium',
        className,
      )}
      {...props}
    />
  );
}
