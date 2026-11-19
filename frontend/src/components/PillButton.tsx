import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode; onClick: () => void };

// お知らせの帯の中に置く、小さな丸いボタン（位置情報の「許可する」など）
export function PillButton({ children, onClick }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="touch-target h-auto rounded-full bg-muted px-3 py-1.5 text-sm font-bold text-primary"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
