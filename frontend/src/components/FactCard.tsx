import type { LucideIcon } from 'lucide-react';

type Props = { icon: LucideIcon; title: string; body: string };

// C5 の豆知識のカード
export function FactCard({ icon: Icon, title, body }: Props) {
  return (
    <article className="flex gap-3 rounded-[20px] bg-card px-4 py-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] leading-6 font-bold">{title}</h2>
        <p className="text-[15px] leading-[22px] font-medium text-muted-foreground">{body}</p>
      </div>
    </article>
  );
}
