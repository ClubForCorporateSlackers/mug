import { ChevronRight, Frown, Heart, MapPin, Zap } from 'lucide-react';
import type { PinStamp } from '@/lib/types';

type Props = {
  place: string;
  when: string;
  stamp: PinStamp | null;
  stampLabel: string;
  memo: string;
  odaiji: number;
  onClick: () => void;
};

// D2 自分のピンのカード。場所・日時とスタンプ・ひとこと・もらった「お大事に」
export function MyPinCard({ place, when, stamp, stampLabel, memo, odaiji, onClick }: Props) {
  const Icon = stamp === 'kayui' ? Frown : stamp === 'itai' ? Zap : MapPin;
  return (
    <button type="button" className="flex w-full gap-3 rounded-[20px] bg-card px-4 py-4 text-left" onClick={onClick}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[17px] leading-6 font-bold">{place}</span>
        <span className="text-xs leading-4 font-medium text-muted-foreground">
          {when}・{stampLabel}
        </span>
        {memo ? <span className="text-[15px] leading-[22px] font-medium">{memo}</span> : null}
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Heart className="size-3.5 text-primary" aria-hidden />
          お大事に {odaiji}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
