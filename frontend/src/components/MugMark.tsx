import pinMosquito from '@/assets/pin-mosquito.svg';
import { cn } from '@/lib/utils';

type Props = { className?: string; label?: string };

// Figma の「Pin / Mosquito」。蚊の顔＋口がピン。縦横比は 40:56
export function MugMark({ className, label = 'むふ' }: Props) {
  return <img src={pinMosquito} width={40} height={56} alt={label} className={cn('h-14 w-10', className)} />;
}
