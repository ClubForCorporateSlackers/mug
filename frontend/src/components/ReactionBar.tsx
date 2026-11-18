import { CirclePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REACTIONS } from '@/lib/labels';
import type { ReactionType } from '@/lib/types';
import { ReactionIcon } from './ReactionIcon';

type Props = {
  counts: Partial<Record<ReactionType, number>>;
  mine: ReactionType[];
  onToggle: (type: ReactionType) => void;
  onMore: () => void;
};

// B7 のリアクションの列。押したものは赤い枠。「＋」でリアクションのシート（B8）を開く
export function ReactionBar({ counts, mine, onToggle, onMore }: Props) {
  const shown = REACTIONS.filter((item) => (counts[item.value] ?? 0) > 0 || mine.includes(item.value));
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="リアクション">
      {shown.map((reaction) => {
        const on = mine.includes(reaction.value);
        return (
          <button
            key={reaction.value}
            type="button"
            aria-pressed={on}
            className={cn(
              'inline-flex h-9 items-center gap-1 rounded-full px-3 text-[15px] font-medium',
              on ? 'border-2 border-primary bg-accent' : 'bg-muted',
            )}
            onClick={() => onToggle(reaction.value)}
          >
            <ReactionIcon type={reaction.value} className="size-5" />
            {reaction.label}
            <span className={on ? 'text-primary' : 'text-muted-foreground'}>{counts[reaction.value] ?? 0}</span>
          </button>
        );
      })}
      <button
        type="button"
        aria-label="リアクションを送る"
        className="grid size-9 place-items-center rounded-full bg-muted"
        onClick={onMore}
      >
        <CirclePlus className="size-5" aria-hidden />
      </button>
    </div>
  );
}
