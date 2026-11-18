import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

// 「取り消しますか？」「ログアウトしますか？」などの確認（Figma の Alert）
export function ConfirmDialog({ open, title, description, confirmLabel, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <AlertDialogContent className="w-[270px] gap-0 overflow-hidden rounded-[14px] border-0 bg-card p-0 shadow-floating">
        <AlertDialogHeader className="gap-1 px-4 pt-5 pb-4 text-center sm:text-center">
          <AlertDialogTitle className="text-[17px] leading-6 font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-[18px] font-medium text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-0 border-t border-border sm:grid-cols-2">
          <AlertDialogCancel
            variant="ghost"
            className="h-11 rounded-none border-0 text-[17px] font-medium text-primary shadow-none"
            onClick={onCancel}
          >
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction
            variant="ghost"
            className="h-11 rounded-none border-l border-border text-[17px] font-bold text-primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
