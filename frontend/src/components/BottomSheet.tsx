import type { ReactNode } from 'react';

type Props = {
  label: string;
  onClose: () => void;
  children: ReactNode;
};

// 画面の下から出るシート。外側を押すと閉じる。
export function BottomSheet({ label, onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-20 mx-auto flex max-w-[430px] flex-col justify-end bg-foreground/30"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="flex max-h-[88svh] flex-col overflow-y-auto rounded-t-3xl bg-card px-4 pt-2 pb-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-muted" aria-hidden />
        {children}
      </section>
    </div>
  );
}
