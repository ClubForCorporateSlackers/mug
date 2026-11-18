import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RankingItem } from '@/lib/api-types';

type Props = {
  // 「ニックネーム」「市町村」「血液型」など、名前の列の見出し
  labelHeader: string;
  items: RankingItem[];
  loading?: boolean;
  error?: string | null;
};

// ランキング1種類分の表
export function RankingTable({ labelHeader, items, loading = false, error = null }: Props) {
  if (loading) return <p className="p-4 text-sm text-muted-foreground">読み込み中…</p>;
  if (error) return <p className="p-4 text-sm text-destructive">読み込めませんでした：{error}</p>;
  if (items.length === 0) return <p className="p-4 text-sm text-muted-foreground">今月はまだありません</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 text-right">順位</TableHead>
          <TableHead>{labelHeader}</TableHead>
          <TableHead className="w-20 text-right">件数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, i) => (
          // 同じ順位・同じ名前がありうるので、並び順も key に入れる
          <TableRow key={`${i}-${item.rank}-${item.label}`}>
            <TableCell className="text-right font-medium">{item.rank}位</TableCell>
            <TableCell>{item.label}</TableCell>
            <TableCell className="text-right">{item.count}件</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
