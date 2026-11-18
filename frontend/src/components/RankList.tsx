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

// 1〜3位は色を変える（Figma の赤・オレンジ・黄）
function rankClass(rank: number): string {
  if (rank === 1) return 'bg-primary text-primary-foreground';
  if (rank === 2) return 'bg-chart-1 text-foreground';
  if (rank === 3) return 'bg-secondary text-foreground';
  return 'bg-muted text-foreground';
}

function barClass(rank: number): string {
  if (rank === 1) return 'bg-primary';
  if (rank === 2) return 'bg-chart-1';
  if (rank === 3) return 'bg-chart-4';
  return 'bg-foreground';
}

export function RankList({ items }: Props) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">この月の投稿はまだありません</p>;
  }
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ol className="flex flex-col divide-y">
      {items.map((item) => (
        <li
          key={`${item.rank}-${item.label}`}
          className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3 font-bold"
        >
          <span className={cn('grid size-8 place-items-center rounded-full text-sm', rankClass(item.rank))}>
            {item.rank}
          </span>
          <span>
            {item.label}
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-muted">
              <span className={cn('block h-full rounded-full', barClass(item.rank), widthClass(item.count / max))} />
            </span>
          </span>
          <span className="text-sm">{item.count}回</span>
        </li>
      ))}
    </ol>
  );
}
