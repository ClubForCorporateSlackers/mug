import type { ReactNode } from 'react';

type Props = { children: ReactNode };

// A4 の白いカード（入力欄をまとめる）
export function FormCard({ children }: Props) {
  return <div className="flex w-full flex-col gap-5 rounded-[20px] bg-card px-4 py-5">{children}</div>;
}
