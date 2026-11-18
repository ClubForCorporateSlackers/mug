import type { LucideIcon } from 'lucide-react';

type Props = { icon: LucideIcon; children: string };

// 淡い赤のお知らせカード（C5 の最後の一言など）
export function NoteCard({ icon: Icon, children }: Props) {
  return (
    <p className="flex items-center gap-3 rounded-[20px] bg-accent px-4 py-4 text-[15px] leading-[22px] font-medium">
      <Icon className="size-6 shrink-0 text-primary" aria-hidden />
      {children}
    </p>
  );
}
