import { MessageCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Pin } from '@/lib/api-types';
import { PIN_STAMP_LABEL, REACTION_LABEL, REACTION_TYPES } from '@/lib/api-types';

type Props = {
  pin: Pin;
  onClose: () => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ピンを押したときに出す詳細。ピンは匿名なので、誰が立てたかは出さない
export function PinDetailCard({ pin, onClose }: Props) {
  return (
    <Card className="w-full max-w-sm gap-3 py-4 shadow-lg">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              {pin.city}
              {pin.stamp && (
                <Badge variant={pin.stamp === 'kayui' ? 'destructive' : 'secondary'}>
                  {PIN_STAMP_LABEL[pin.stamp]}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{formatDate(pin.createdAt)}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" aria-label="閉じる" onClick={onClose}>
            <X />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <p className="text-sm whitespace-pre-wrap">
          {pin.memo || <span className="text-muted-foreground">メモはありません</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {REACTION_TYPES.map((type) => (
            <Badge key={type} variant="outline">
              {REACTION_LABEL[type]} {pin.reactions[type] ?? 0}
            </Badge>
          ))}
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MessageCircle className="size-4" />
          コメント {pin.commentCount}件
        </p>
      </CardContent>
    </Card>
  );
}
