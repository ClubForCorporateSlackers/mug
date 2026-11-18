import type { FormEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Props = {
  value: string;
  placeholder: string;
  busy?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

// B7 の下のコメント入力（1〜100文字）と送信ボタン
export function CommentInput({ value, placeholder, busy = false, onChange, onSubmit }: Props) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  return (
    <form className="flex items-center gap-2 border-t border-border bg-card px-4 py-2" onSubmit={submit}>
      <Input
        aria-label="コメント"
        placeholder={placeholder}
        maxLength={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-full border-0 bg-muted px-4 text-[17px] shadow-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-ring md:text-[17px]"
      />
      <button
        type="submit"
        aria-label="送信"
        disabled={busy || value.trim().length === 0}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
      >
        <ArrowUp className="size-5" aria-hidden />
      </button>
    </form>
  );
}
