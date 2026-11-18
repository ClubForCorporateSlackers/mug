import { CircleCheck, X } from 'lucide-react';
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
  // × で閉じる（ピンはそのまま）
  onClose: () => void;
  // 「取り消す」（ピンを消す）
  onCancel: () => void;
  onDone: () => void;
};

// B4。ピンを立てたあとに出す。スタンプとひとことは任意で付ける
export function PostPanel({ stamp, memo, busy = false, error, onStamp, onMemo, onClose, onCancel, onDone }: Props) {
  return (
    <BottomPanel label="立てたピン">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-8 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-1 flex-col">
          <h2 className="text-xl leading-7 font-bold">ピンを立てました！</h2>
          <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
            位置は半径100m以内でぼかして公開されます
          </p>
        </div>
        <button type="button" aria-label="閉じる" className="grid size-8 place-items-center" onClick={onClose}>
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
          {busy ? '保存中' : '完了'}
        </MugButton>
      </div>
    </BottomPanel>
  );
}
