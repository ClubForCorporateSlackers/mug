import { Ellipsis } from 'lucide-react';
import { MascotCircle } from './MascotCircle';

type Props = { title: string; subtitle: string; onMenu: () => void };

// B7 の上の行。蚊のアイコン、「匿名さんのピン」、場所と時間、「…」メニュー
export function PinHeader({ title, subtitle, onMenu }: Props) {
  return (
    <div className="flex items-center gap-3">
      <MascotCircle className="size-12" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[17px] leading-6 font-bold">{title}</p>
        <p className="truncate text-[13px] leading-[18px] font-medium text-muted-foreground">{subtitle}</p>
      </div>
      <button
        type="button"
        aria-label="メニュー"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-muted"
        onClick={onMenu}
      >
        <Ellipsis className="size-5" aria-hidden />
      </button>
    </div>
  );
}
