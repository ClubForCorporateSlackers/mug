import { cn } from '@/lib/utils';

type Props = { name: string; size?: 'md' | 'lg' };

// ニックネームの最初の1文字を黄色い丸に入れる
export function InitialAvatar({ name, size = 'md' }: Props) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand font-bold',
        size === 'lg' ? 'size-22 text-[28px]' : 'size-16 text-2xl',
      )}
      aria-hidden
    >
      {[...name][0] ?? '？'}
    </span>
  );
}
