import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  // 確認の結果として表示する文
  result: string;
  onCheck: () => void;
};

// 画面 → Worker → Lambda がつながっているかを確かめるカード（仮の画面用）
export function ApiCheckCard({ result, onCheck }: Props) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>むふ</CardTitle>
        <CardDescription>ここで蚊に刺された、を地図で共有する</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button className="h-11" onClick={onCheck}>
          APIの疎通を確認
        </Button>
        <p className="text-sm text-muted-foreground">{result}</p>
      </CardContent>
    </Card>
  );
}
