import type { LucideIcon } from 'lucide-react';

type Props = { icon: LucideIcon; children: string };

// 白いカードにアイコンと短い文。A1「ようこそ」の特長や、A8「位置情報」の理由に使う
export function InfoRow({ icon: Icon, children }: Props) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3.5 text-[15px] leading-[22px] font-medium tracking-[0.01em]">
      <Icon className="mt-px size-6 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
