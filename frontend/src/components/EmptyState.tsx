import { MascotCircle } from './MascotCircle';
import { MugButton } from './MugButton';

type Props = { title: string; body: string; actionLabel?: string; onAction?: () => void };

// D3 のような「まだありません」の画面の中身
export function EmptyState({ title, body, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 text-center">
      <MascotCircle size="md" />
      <h2 className="mt-2 text-xl leading-7 font-bold">{title}</h2>
      <p className="text-[15px] leading-[22px] font-medium text-muted-foreground">{body}</p>
      {actionLabel && onAction ? (
        <MugButton full={false} className="mt-2 w-60" onClick={onAction}>
          {actionLabel}
        </MugButton>
      ) : null}
    </div>
  );
}
