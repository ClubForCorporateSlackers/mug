import { MugMark } from './MugMark';

type Props = { eyebrow: string; title: string; note?: string };

// C1 の上の黄色いカード（「いまいる杉並区は 東京都で3位」）
export function RankHighlight({ eyebrow, title, note }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-brand px-4 py-4">
      <MugMark label="" className="h-14 w-10 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <p className="text-xs leading-4 font-medium text-muted-foreground">{eyebrow}</p>
        <p className="text-[22px] leading-7 font-bold">{title}</p>
        {note ? <p className="text-xs leading-4 font-medium text-muted-foreground">{note}</p> : null}
      </div>
    </div>
  );
}
