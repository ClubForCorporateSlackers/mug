import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RankingTable } from '@/components/RankingTable';
import type { RankingItem, RankingType } from '@/lib/api-types';

export type RankingSection = { items: RankingItem[]; loading: boolean; error: string | null };

type Props = {
  // 表示している月（YYYY-MM）。まだ分からなければ null
  month: string | null;
  sections: Record<RankingType, RankingSection>;
};

const TABS: { type: RankingType; title: string; labelHeader: string }[] = [
  { type: 'user', title: '人', labelHeader: 'ニックネーム' },
  { type: 'city', title: '市町村', labelHeader: '市町村' },
  { type: 'blood', title: '血液型', labelHeader: '血液型' },
];

function formatMonth(month: string) {
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

// 人・市町村・血液型の3つのランキングをタブで切り替える
export function RankingTabs({ month, sections }: Props) {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>{month ? `${formatMonth(month)}のランキング` : '今月のランキング'}</CardTitle>
        <CardDescription>蚊に刺された（ピンを立てた）件数の多い順・上位20件</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="user">
          <TabsList className="w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t.type} value={t.type}>
                {t.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.type} value={t.type}>
              <RankingTable labelHeader={t.labelHeader} {...sections[t.type]} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
