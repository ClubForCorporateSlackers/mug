import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
  onClick: () => void;
  // true で左に「<」を付ける（前の画面へ戻るリンク）
  back?: boolean;
  // true で文字を小さくする
  small?: boolean;
  // self-start など、並べ方のクラス
  className?: string;
};

// 赤い文字だけのリンク風ボタン（「< マップ」「パスワードをお忘れですか？」など）
export function LinkButton({ children, onClick, back = false, small = false, className }: Props) {
  return (
    <Button
      type="button"
      variant="link"
      className={cn(
        'touch-target h-auto gap-1 p-0 font-bold has-[>svg]:px-0',
        small ? 'text-sm' : 'text-base',
        className,
      )}
      onClick={onClick}
    >
      {back ? <ChevronLeft className="size-5" aria-hidden /> : null}
      {children}
    </Button>
  );
}
