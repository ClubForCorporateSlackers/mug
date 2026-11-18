import { BottomPanel } from './BottomPanel';
import { MugButton } from './MugButton';

type Props = { onCancel: () => void; onConfirm: () => void };

// B5。地図を動かしてピンの位置を合わせる
export function AdjustPanel({ onCancel, onConfirm }: Props) {
  return (
    <BottomPanel label="ピンの位置を調整">
      <p className="text-center text-[13px] leading-[18px] font-medium text-muted-foreground">
        公開されるときは、ここから半径100m以内でぼかされます。
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MugButton tone="gray" onClick={onCancel}>
          キャンセル
        </MugButton>
        <MugButton onClick={onConfirm}>この位置にする</MugButton>
      </div>
    </BottomPanel>
  );
}
