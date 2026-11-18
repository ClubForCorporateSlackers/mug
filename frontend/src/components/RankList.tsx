import { cn } from 'cn';
import type { RankItem } from '@/lib/types';

type Props = { items: RankItem[] };

function widthClass(ratio: number): string {
  if (ratio > 0.85) return 'w-full';
  if (ratio > 0.7) return 'w-10/12';
  if (ratio > 0.55) return 'w-8/12';
  if (ratio > 0.4) return 'w-6/12';
  if (ratio > 0.2) return 'w-4/12';
  return 'w-2/12';
}

export function RankList({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">この月の投稿はまだありません</p>;
  }
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={`${item.rank}-${item.label}`}
          className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 text-sm font-bold"
        >
          <span>{item.rank}</span>
          <span>
            {item.label}
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-muted">
              <span className={cn('block h-full rounded-full bg-primary', widthClass(item.count / max))} />
            </span>
          </span>
          <span>{item.count}</span>
        </li>
      ))}
    </ol>
  );
}
