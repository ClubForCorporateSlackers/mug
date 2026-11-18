import type { ReactNode } from 'react';

type Props = { children: ReactNode; label: string };

// MenuRow をまとめる角丸のカード
export function MenuGroup({ children, label }: Props) {
  return (
    <nav aria-label={label} className="flex flex-col overflow-hidden rounded-[20px] bg-card">
      {children}
    </nav>
  );
}
