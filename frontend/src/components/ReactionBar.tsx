import { cn } from 'cn';
import { REACTIONS } from '@/lib/labels';
import type { ReactionType } from '@/lib/types';

type Props = {
  counts: Partial<Record<ReactionType, number>>;
  mine: ReactionType[];
  onToggle: (type: ReactionType) => void;
};

export function ReactionBar({ counts, mine, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="リアクション">
      {REACTIONS.map((reaction) => {
        const on = mine.includes(reaction.value);
        const count = counts[reaction.value] ?? 0;
        return (
          <button
            key={reaction.value}
            type="button"
            aria-pressed={on}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-bold',
              on ? 'border-foreground bg-foreground text-card' : 'bg-card',
            )}
            onClick={() => onToggle(reaction.value)}
          >
            {reaction.label} {count}
          </button>
        );
      })}
    </div>
  );
}
