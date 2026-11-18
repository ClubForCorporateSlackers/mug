import { cn } from '@/lib/utils';
import type { RankItem } from '@/lib/types';

type Props = { title: string; items: RankItem[]; unit: string; footer?: string; loading?: boolean };

// 棒の高さを Tailwind のクラスにする（style を使わないため、10段階に丸める）
const HEIGHTS = ['h-4', 'h-6', 'h-9', 'h-12', 'h-15', 'h-18', 'h-21', 'h-24', 'h-30', 'h-36'];

function heightClass(ratio: number): string {
  return HEIGHTS[Math.min(9, Math.max(0, Math.ceil(ratio * 10) - 1))];
}

// C2 の血液型の棒グラフ。いちばん多い型だけ赤
export function BloodChart({ title, items, unit, footer, loading = false }: Props) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-card px-4 py-4" aria-label={title}>
      <h2 className="text-[17px] leading-6 font-bold">{title}</h2>
      {loading ? (
        // グラフと同じ高さで待つ（読み込み終わりに枠の大きさが変わらないように）
        <p className="grid h-48 place-items-center text-[15px] text-muted-foreground">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">この月の投稿はまだありません</p>
      ) : (
        <ol className="flex h-48 items-end justify-around gap-3">
          {items.map((item, index) => (
            <li key={item.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[13px] font-bold">
                {item.count}
                {unit}
              </span>
              <span
                className={cn(
                  'w-full max-w-14 rounded-t-xl',
                  index === 0 ? 'bg-risk-high' : 'bg-chart-2',
                  heightClass(item.count / max),
                )}
              />
              <span className="text-[13px] font-medium">{item.label}</span>
            </li>
          ))}
        </ol>
      )}
      {footer ? (
        <p className="rounded-xl bg-accent px-3 py-2 text-[13px] leading-[18px] font-bold text-foreground">{footer}</p>
      ) : null}
    </section>
  );
}
