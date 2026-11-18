import { ChevronLeft } from 'lucide-react';

type Props = { title: string; onBack?: () => void };

export function ScreenHeader({ title, onBack }: Props) {
  return (
    <header className="flex items-center gap-2 px-3 py-2">
      {onBack ? (
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full border bg-card"
          onClick={onBack}
          aria-label="戻る"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      ) : null}
      <h1 className="text-lg font-bold">{title}</h1>
    </header>
  );
}
