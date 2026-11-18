import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  // 見出しを画面に出すか（出さないときも読み上げ用には残す）
  showTitle?: boolean;
  description?: string;
  children: ReactNode;
  // plain：iOS のアクションシートのように白い板を浮かせる（B9・B10）
  tone?: 'card' | 'plain';
  className?: string;
};

// 下から出るシート（地図を暗くする）。B7 ピン詳細、B8 リアクション、C3・C4 絞り込みなど
export function BottomSheet({
  open,
  onClose,
  title,
  showTitle = false,
  description,
  children,
  tone = 'card',
  className,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          'mx-auto max-h-[88svh] max-w-[430px] gap-0 border-0 pb-[env(safe-area-inset-bottom)]',
          tone === 'card' ? 'rounded-t-[28px] bg-card' : 'bg-transparent px-2 shadow-none',
          className,
        )}
      >
        {tone === 'card' ? (
          <span className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-border" aria-hidden />
        ) : null}
        <SheetTitle className={showTitle ? 'px-4 pt-3 text-xl leading-7 font-bold' : 'sr-only'}>{title}</SheetTitle>
        <SheetDescription className="sr-only">{description ?? title}</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
