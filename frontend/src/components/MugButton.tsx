import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

type Props = ComponentProps<typeof Button> & { full?: boolean };

// Figma の赤い主ボタン。横幅いっぱいに置くことが多い。
export function MugButton({ className, full = true, size = 'lg', ...props }: Props) {
  return (
    <Button
      size={size}
      className={cn('h-12 rounded-full text-base font-bold', full && 'w-full', className)}
      {...props}
    />
  );
}
