import type { ReactNode } from 'react';
import { MugMark } from './MugMark';

type Props = { children: ReactNode };

// E1。アプリの幅は最大 430px で中央。広い画面（PC）では左に紹介文を出す
export function AppFrame({ children }: Props) {
  return (
    <div className="min-h-svh bg-secondary">
      <aside className="fixed top-1/3 left-[max(2rem,calc(50%-215px-380px))] hidden w-80 flex-col gap-3 xl:flex">
        <MugMark label="" className="h-[74px] w-[53px]" />
        <p className="text-[28px] leading-[38px] font-bold">むふ</p>
        <p className="text-base leading-6 font-medium text-muted-foreground">
          スマホで開くと、刺された場所にすぐピンを立てられます。
        </p>
      </aside>
      <div className="relative mx-auto min-h-svh w-full max-w-[430px] bg-background lg:shadow-floating">{children}</div>
    </div>
  );
}
