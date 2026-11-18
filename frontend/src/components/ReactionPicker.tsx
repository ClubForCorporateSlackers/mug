import { Hand, Heart, ThumbsUp, X } from 'lucide-react';
import { cn } from 'cn';
import { REACTIONS } from '@/lib/labels';
import type { ReactionType } from '@/lib/types';
import { BottomSheet } from './BottomSheet';

const ICONS: Record<ReactionType, typeof Heart> = { odaiji: Heart, kaite: Hand, wakaru: ThumbsUp };

type Props = {
  mine: ReactionType[];
  onPick: (type: ReactionType) => void;
  onClose: () => void;
};

export function ReactionPicker({ mine, onPick, onClose }: Props) {
  return (
    <BottomSheet label="リアクションを送る" onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">リアクションを送る</h2>
        <button type="button" className="grid size-9 place-items-center" aria-label="閉じる" onClick={onClose}>
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {REACTIONS.map((reaction) => {
          const Icon = ICONS[reaction.value];
          const on = mine.includes(reaction.value);
          return (
            <button
              key={reaction.value}
              type="button"
              aria-pressed={on}
              className="flex flex-col items-center gap-1 text-xs font-bold"
              onClick={() => onPick(reaction.value)}
            >
              <span
                className={cn(
                  'grid size-14 place-items-center rounded-full bg-secondary',
                  on && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
                )}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              {reaction.label}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">リアクションにはニックネームが表示されます。</p>
    </BottomSheet>
  );
}
