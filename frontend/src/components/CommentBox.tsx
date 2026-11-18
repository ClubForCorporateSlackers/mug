import type { FormEvent } from 'react';
import { ArrowUp } from 'lucide-react';

type Props = {
  value: string;
  placeholder: string;
  busy?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function CommentBox({ value, placeholder, busy = false, onChange, onSubmit }: Props) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="flex items-center gap-2" onSubmit={submit}>
      <input
        className="h-11 min-w-0 flex-1 rounded-full bg-muted px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="コメント"
        maxLength={100}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="submit"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        aria-label="コメントを送る"
        disabled={busy}
      >
        <ArrowUp className="size-5" aria-hidden />
      </button>
    </form>
  );
}
