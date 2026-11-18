import { cn } from '@/lib/utils';
import { MugMark } from './MugMark';

type Props = { size?: 'sm' | 'md' | 'lg'; dashed?: boolean; className?: string };

const SIZES = {
  sm: { circle: 'size-11', mark: 'h-9 w-[26px]' },
  md: { circle: 'size-30', mark: 'h-24 w-[68px]' },
  lg: { circle: 'size-45', mark: 'h-[101px] w-[72px]' },
};

// 黄色い丸の中の蚊。投稿ボタンの顔、ピン詳細のアイコン、位置情報の画面などに使う
export function MascotCircle({ size = 'sm', dashed = false, className }: Props) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand',
        SIZES[size].circle,
        dashed && 'border-2 border-dashed border-primary',
        className,
      )}
    >
      <MugMark label="" className={SIZES[size].mark} />
    </span>
  );
}
