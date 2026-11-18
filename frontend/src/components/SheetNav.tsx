import { ChevronLeft } from 'lucide-react';
import { TextAction } from './TextAction';

type Props = {
  title: string;
  // 左：「閉じる」か、戻る矢印つきの文字（「絞り込み」など）
  leadingLabel: string;
  leadingBack?: boolean;
  onLeading: () => void;
  trailingLabel?: string;
  onTrailing?: () => void;
};

// シートの上の行（C3「閉じる／絞り込み／完了」、C4「＜ 絞り込み／都道府県」）
export function SheetNav({ title, leadingLabel, leadingBack = false, onLeading, trailingLabel, onTrailing }: Props) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center px-2">
      <TextAction className="flex items-center justify-self-start" onClick={onLeading}>
        {leadingBack ? <ChevronLeft className="size-6" aria-hidden /> : null}
        {leadingLabel}
      </TextAction>
      <p className="text-[17px] font-bold">{title}</p>
      {trailingLabel && onTrailing ? (
        <TextAction strong className="justify-self-end px-2" onClick={onTrailing}>
          {trailingLabel}
        </TextAction>
      ) : (
        <span />
      )}
    </div>
  );
}
