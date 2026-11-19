import { BottomSheet } from './BottomSheet';
import { MugButton } from './MugButton';

type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmSheet({ title, body, confirmLabel, cancelLabel = 'キャンセル', onConfirm, onCancel }: Props) {
  return (
    <BottomSheet label={title} onClose={onCancel}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm">{body}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <MugButton variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </MugButton>
        <MugButton onClick={onConfirm}>{confirmLabel}</MugButton>
      </div>
    </BottomSheet>
  );
}
