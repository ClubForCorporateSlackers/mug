import type { ComponentType, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
  // 文字の左に出すアイコン（なくてもよい）
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  onClick: () => void;
};

// 押すと選ぶ画面が開く、丸い絞り込みボタン（ランキングの「月」「地域」）
export function FilterChip({ children, icon: Icon, onClick }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="touch-target h-auto gap-1 rounded-full bg-card px-3 py-2 text-sm font-bold has-[>svg]:px-3"
      onClick={onClick}
    >
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
      <ChevronDown className="size-4" aria-hidden />
    </Button>
  );
}
