import { CircleCheck, Move, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PinStamp } from '@/lib/types';
import { BottomPanel } from './BottomPanel';
import { MugButton } from './MugButton';
import { StampPicker } from './StampPicker';

type Props = {
  stamp: PinStamp | null;
  memo: string;
  busy?: boolean;
  error?: string;
  onStamp: (stamp: PinStamp | null) => void;
  onMemo: (memo: string) => void;
  onAdjust: () => void;
  onCancel: () => void;
  onDone: () => void;
};

// B4。ピンにスタンプとひとことを付けて立てる
export function PostPanel({ stamp, memo, busy = false, error, onStamp, onMemo, onAdjust, onCancel, onDone }: Props) {
  return (
    <BottomPanel label="ピンを立てる">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-8 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-1 flex-col">
          <h2 className="text-xl leading-7 font-bold">ここにピンを立てます</h2>
          <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
            位置は半径100m以内でぼかして公開されます
          </p>
        </div>
        <button type="button" aria-label="閉じる" className="grid size-8 place-items-center" onClick={onCancel}>
          <X className="size-6 text-muted-foreground" aria-hidden />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] leading-[18px] font-bold text-muted-foreground">スタンプ（任意）</p>
        <StampPicker value={stamp} onChange={onStamp} />
      </div>
      <Input
        aria-label="ひとこと（任意。匿名で表示されます）"
        placeholder="ひとこと（任意）"
        maxLength={100}
        value={memo}
        onChange={(event) => onMemo(event.target.value)}
        className="h-[50px] rounded-[14px] border-0 bg-muted px-4 text-[17px] shadow-none placeholder:text-placeholder focus-visible:border-2 focus-visible:border-ring focus-visible:ring-0 md:text-[17px]"
      />
      <button
        type="button"
        className="flex items-center gap-2 self-start text-[15px] font-bold text-primary"
        onClick={onAdjust}
      >
        <Move className="size-5" aria-hidden />
        ピンの位置を調整
      </button>
      {error ? (
        <p className="text-[13px] font-medium text-primary" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <MugButton tone="gray" onClick={onCancel}>
          取り消す
        </MugButton>
        <MugButton disabled={busy} onClick={onDone}>
          {busy ? '送信中' : '完了'}
        </MugButton>
      </div>
    </BottomPanel>
  );
}
