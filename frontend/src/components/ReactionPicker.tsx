import { Hand, Heart, ThumbsUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  // ToggleGroup は「押したあとの全部の値」を知らせるので、前と変わった1つを探して onPick に渡す
  function change(next: string[]) {
    const changed = REACTIONS.find((reaction) => next.includes(reaction.value) !== mine.includes(reaction.value));
    if (changed) onPick(changed.value);
  }

  return (
    <BottomSheet label="リアクションを送る" onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">リアクションを送る</h2>
        <Button variant="ghost" size="icon" aria-label="閉じる" onClick={onClose}>
          <X className="size-5" aria-hidden />
        </Button>
      </div>
      <ToggleGroup
        type="multiple"
        spacing={3}
        className="mt-4 grid w-full grid-cols-3"
        aria-label="リアクション"
        value={mine}
        onValueChange={change}
      >
        {REACTIONS.map((reaction) => {
          const Icon = ICONS[reaction.value];
          return (
            <ToggleGroupItem
              key={reaction.value}
              value={reaction.value}
              className="group h-auto flex-col gap-1 p-0 text-xs font-bold hover:bg-transparent hover:text-inherit data-[state=on]:bg-transparent data-[state=on]:text-inherit"
            >
              <span className="grid size-14 place-items-center rounded-full bg-secondary group-data-[state=on]:ring-2 group-data-[state=on]:ring-primary group-data-[state=on]:ring-offset-2 group-data-[state=on]:ring-offset-card">
                <Icon className="size-6" aria-hidden />
              </span>
              {reaction.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <p className="mt-4 text-center text-xs text-muted-foreground">リアクションにはニックネームが表示されます。</p>
    </BottomSheet>
  );
}
