import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = {
  onUpdate: () => void;
  onClose: () => void;
};

// 新しい版のアプリが届いたときのお知らせ。「更新」で読み込み直す（勝手には読み込み直さない）
export function UpdateNotice({ onUpdate, onClose }: Props) {
  return (
    <Card
      role="status"
      className="pointer-events-auto flex-row items-center gap-2 rounded-2xl py-2 pr-1 pl-4 text-sm font-medium shadow-md"
    >
      <p className="flex-1">新しいバージョンがあります</p>
      <Button type="button" className="h-11 rounded-full px-5 font-bold" onClick={onUpdate}>
        更新
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-full text-muted-foreground"
        aria-label="閉じる"
        onClick={onClose}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </Card>
  );
}
