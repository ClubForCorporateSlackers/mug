import type { ComponentType } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';

type Props = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  // 読み上げ用の名前（アイコンだけなので必須）
  label: string;
  onClick: () => void;
  disabled?: boolean;
  // 地図の上に置くときの pointer-events-auto など、並べ方のクラス
  className?: string;
};

// 地図の上に浮かべる、白い丸のアイコンボタン（マイページ・現在地へ など）
export function RoundIconButton({ icon: Icon, label, onClick, disabled, className }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn('size-12 shrink-0 rounded-full bg-card p-0', className)}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="size-5" aria-hidden />
    </Button>
  );
}
