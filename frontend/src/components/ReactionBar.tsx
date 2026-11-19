import { CirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
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
      {shown.map((reaction) => (
        <Toggle
          key={reaction.value}
          pressed={mine.includes(reaction.value)}
          className="touch-target h-auto rounded-full border border-transparent bg-muted px-3 py-1.5 text-sm font-bold hover:bg-muted hover:text-inherit data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          onPressedChange={() => onToggle(reaction.value)}
        >
          {reaction.label} {counts[reaction.value] ?? 0}
        </Toggle>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="size-11 rounded-full bg-muted hover:bg-muted/80 hover:text-inherit"
        aria-label="リアクションを送る"
        onClick={onAdd}
      >
        <CirclePlus className="size-5" aria-hidden />
      </Button>
    </div>
  );
}
