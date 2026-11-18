import { LoaderCircle, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  // 現在地を取得している最中
  loading?: boolean;
  onClick: () => void;
};

// 地図を現在地へ動かすボタン
export function LocateButton({ loading = false, onClick }: Props) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="bg-background shadow-md"
      aria-label="現在地を表示"
      title="現在地を表示"
      disabled={loading}
      onClick={onClick}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}
    </Button>
  );
}
