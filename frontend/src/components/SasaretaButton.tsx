import { cn } from '@/lib/utils';
import { MascotCircle } from './MascotCircle';

type Props = { onClick: () => void; disabled?: boolean; label?: string };

// Figma の Button / Sasareta (FAB)。いつも出しておく主な操作
export function SasaretaButton({ onClick, disabled = false, label = 'ここで刺された！' }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'relative isolate flex h-16 w-full items-center justify-center gap-3 rounded-full text-xl leading-7 font-bold text-primary-foreground',
        // 無効のときは淡い赤。地図が透けないよう、白の上に半分の濃さの赤を重ねる
        disabled
          ? 'bg-card before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-primary/50'
          : 'bg-primary shadow-fab',
      )}
      onClick={onClick}
    >
      <MascotCircle />
      {label}
    </button>
  );
}
