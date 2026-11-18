import { cn } from '@/lib/utils';

type Props = {
  // 表示する文。null なら何も出さない
  message: string | null;
  tone?: 'info' | 'error';
};

// 地図の上に出すお知らせ（「拡大してください」、読み込み中、エラーなど）
export function MapStatusBanner({ message, tone = 'info' }: Props) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        'rounded-full border px-4 py-2 text-sm shadow-md',
        tone === 'info' && 'border-border bg-background text-foreground',
        tone === 'error' && 'border-destructive bg-background text-destructive',
      )}
    >
      {message}
    </div>
  );
}
