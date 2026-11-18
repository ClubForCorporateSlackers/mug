import type { ReactNode } from 'react';

type Props = { children: ReactNode; label: string };

// 地図の上に重ねる、下から出る白い板（地図は暗くしない）。B4・B5 で使う
export function BottomPanel({ children, label }: Props) {
  return (
    <section
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[430px] flex-col gap-4 rounded-t-[28px] bg-card px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-floating"
    >
      <span className="mx-auto h-[5px] w-9 rounded-full bg-border" aria-hidden />
      {children}
    </section>
  );
}
