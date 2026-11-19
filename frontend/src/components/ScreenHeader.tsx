import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { title: string; onBack?: () => void };

export function ScreenHeader({ title, onBack }: Props) {
  return (
    <header className="flex items-center gap-2 px-3 py-2">
      {onBack ? (
        // shadcn の Button（枠つき・アイコンだけ）を丸くして、カードの色に合わせる
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full bg-card shadow-none"
          onClick={onBack}
          aria-label="戻る"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
      ) : null}
      <h1 className="text-lg font-bold">{title}</h1>
    </header>
  );
}
