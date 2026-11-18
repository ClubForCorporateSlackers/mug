import { cn } from '@/lib/utils';
import { REACTIONS } from '@/lib/labels';
import type { ReactionType } from '@/lib/types';
import { ReactionIcon } from './ReactionIcon';

type Props = { mine: ReactionType[]; onToggle: (type: ReactionType) => void; note: string };

// B8 のシートの中身。押しているものは赤い枠
export function ReactionPicker({ mine, onToggle, note }: Props) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
      <div className="grid grid-cols-4 gap-y-4">
        {REACTIONS.map((reaction) => {
          const on = mine.includes(reaction.value);
          return (
            <button
              key={reaction.value}
              type="button"
              aria-pressed={on}
              className="flex flex-col items-center gap-1.5 text-xs leading-4 font-medium"
              onClick={() => onToggle(reaction.value)}
            >
              <span
                className={cn(
                  'grid size-14 place-items-center rounded-full bg-brand',
                  on && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
                )}
              >
                <ReactionIcon type={reaction.value} className="size-7" />
              </span>
              {reaction.label}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs leading-4 font-medium text-muted-foreground">{note}</p>
    </div>
  );
}
