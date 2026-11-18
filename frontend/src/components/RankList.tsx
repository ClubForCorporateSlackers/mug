import { cn } from '@/lib/utils';
import type { RankItem } from '@/lib/types';

type Props = { items: RankItem[]; unit: string; loading?: boolean; empty?: string };

const MEDAL = ['bg-risk-high text-primary-foreground', 'bg-risk-mid', 'bg-risk-low'];
const BAR = ['bg-risk-high', 'bg-risk-mid', 'bg-risk-low'];

// 長さの割合を Tailwind の幅のクラスにする（style を使わないため、12段階に丸める）
const WIDTHS = [
  'w-1/12',
  'w-2/12',
  'w-3/12',
  'w-4/12',
  'w-5/12',
  'w-6/12',
  'w-7/12',
  'w-8/12',
  'w-9/12',
  'w-10/12',
  'w-11/12',
  'w-full',
];

function widthClass(ratio: number): string {
  return WIDTHS[Math.min(11, Math.max(0, Math.ceil(ratio * 12) - 1))];
}

// C1 のランキング。順位の丸（1〜3位は色付き）、名前、件数、件数の棒
export function RankList({ items, unit, loading = false, empty = 'この月の投稿はまだありません' }: Props) {
  if (loading) return <p className="rounded-[20px] bg-card px-4 py-6 text-[15px] text-muted-foreground">読み込み中…</p>;
  if (items.length === 0)
    return <p className="rounded-[20px] bg-card px-4 py-6 text-[15px] text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ol className="overflow-hidden rounded-[20px] bg-card">
      {items.map((item) => {
        const top = item.rank <= 3 ? item.rank - 1 : -1;
        return (
          <li
            key={`${item.rank}-${item.label}`}
            className="grid grid-cols-[28px_1fr_auto] items-center gap-x-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span
              className={cn(
                'row-span-2 grid size-7 place-items-center rounded-full text-[13px] font-bold',
                top >= 0 ? MEDAL[top] : 'bg-muted',
              )}
            >
              {item.rank}
            </span>
            <span className="truncate text-[17px] leading-6 font-bold">{item.label}</span>
            <span className="row-span-2 text-[15px] font-bold">
              {item.count}
              {unit}
            </span>
            <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  'block h-full rounded-full',
                  top >= 0 ? BAR[top] : 'bg-chart-2',
                  widthClass(item.count / max),
                )}
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
