import { CirclePlus } from 'lucide-react';
import { cn } from 'cn';
import { REACTIONS } from '@/lib/labels';
import type { ReactionType } from '@/lib/types';

type Props = {
  counts: Partial<Record<ReactionType, number>>;
  mine: ReactionType[];
  onToggle: (type: ReactionType) => void;
  onAdd: () => void;
};

// 件数があるものと自分が押したものだけ並べ、ほかは「＋」から送る
export function ReactionBar({ counts, mine, onToggle, onAdd }: Props) {
  const shown = REACTIONS.filter((reaction) => (counts[reaction.value] ?? 0) > 0 || mine.includes(reaction.value));
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
              'rounded-full border px-3 py-1.5 text-sm font-bold',
              on ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted',
            )}
            onClick={() => onToggle(reaction.value)}
          >
            {reaction.label} {counts[reaction.value] ?? 0}
          </button>
        );
      })}
      <button
        type="button"
        className="grid size-9 place-items-center rounded-full bg-muted"
        aria-label="リアクションを送る"
        onClick={onAdd}
      >
        <CirclePlus className="size-5" aria-hidden />
      </button>
    </div>
  );
}
