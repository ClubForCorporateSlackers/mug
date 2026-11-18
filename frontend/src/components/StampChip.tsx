import { Frown, Zap } from 'lucide-react';
import { stampLabel } from '@/lib/labels';
import type { PinStamp } from '@/lib/types';

type Props = { stamp: PinStamp };

// ピンに付いたスタンプの黄色い札
export function StampChip({ stamp }: Props) {
  const Icon = stamp === 'kayui' ? Frown : Zap;
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand px-3 py-1.5 text-[15px] leading-[22px] font-bold">
      <Icon className="size-5" aria-hidden />
      {stampLabel(stamp)}
    </span>
  );
}
