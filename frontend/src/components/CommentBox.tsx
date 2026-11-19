import type { FormEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  value: string;
  placeholder: string;
  busy?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

// 入力欄とボタンを離して並べる今の見た目に合わせ、InputGroup ではなく Input と Button を使う
export function CommentBox({ value, placeholder, busy = false, onChange, onSubmit }: Props) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="flex items-center gap-2" onSubmit={submit}>
      <Input
        className="h-11 flex-1 rounded-full border-0 bg-muted px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring md:text-base dark:bg-muted"
        aria-label="コメント"
        maxLength={100}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button type="submit" size="icon" className="size-11 rounded-full" aria-label="コメントを送る" disabled={busy}>
        <ArrowUp className="size-5" aria-hidden />
      </Button>
    </form>
  );
}
