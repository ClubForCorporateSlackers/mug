import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { ChoiceSheet } from '@/components/ChoiceSheet';
import { FilterChip } from '@/components/FilterChip';
import { RankTypeTabs } from '@/components/RankTypeTabs';
import { RankList } from '@/components/RankList';
import { api } from '@/lib/api';
import { currentMonth, monthLabel, prefectureName, shiftMonth } from '@/lib/labels';
import type { TabName } from '@/lib/route';
import type { RankItem, RankType } from '@/lib/types';

// 種類は人・市町村・血液型の3つ（docs/decisions.md #10）
const SEGMENTS: { id: RankType; label: string }[] = [
  { id: 'user', label: '人' },
  { id: 'city', label: '市町村' },
  { id: 'blood', label: '血液型' },
];

const ALL = 'すべての地域';

type Props = { tab: TabName; onTab: (tab: TabName) => void };

export function RankingPage({ tab, onTab }: Props) {
  const thisMonth = useMemo(() => currentMonth(), []);
  const [type, setType] = useState<RankType>('city');
  const [month, setMonth] = useState(thisMonth);
  const [prefecture, setPrefecture] = useState(ALL);
  const [items, setItems] = useState<RankItem[]>([]);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<'month' | 'prefecture' | null>(null);

  useEffect(() => {
    let stop = false;
    api<{ items: RankItem[] }>('GET', `/api/rankings?type=${type}&month=${month}`)
      .then((data) => {
        if (!stop) {
          setItems(data.items);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!stop) setError(err instanceof Error ? err.message : '読み込めませんでした');
      });
    return () => {
      stop = true;
    };
  }, [type, month]);

  const prefectures = useMemo(() => {
    const names = new Set<string>();
    if (type === 'city') {
      for (const item of items) {
        const name = prefectureName(item.label);
        if (name) names.add(name);
      }
    }
    return [ALL, ...names];
  }, [items, type]);

  const months = useMemo(() => [0, -1, -2, -3, -4].map((delta) => shiftMonth(thisMonth, delta)), [thisMonth]);

  const shown =
    type === 'city' && prefecture !== ALL
      ? items
          .filter((item) => item.label.startsWith(prefecture))
          .map((item) => ({ ...item, label: item.label.slice(prefecture.length) }))
      : items;

  function chooseMonth(value: string) {
    if (value !== month) setItems([]);
    setMonth(value);
    setSheet(null);
  }

  function choosePrefecture(name: string) {
    setPrefecture(name);
    setSheet(null);
  }

  function changeType(next: RankType) {
    if (next === type) return;
    setItems([]);
    setPrefecture(ALL);
    setType(next);
  }

  return (
    <main className="flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col gap-4 px-4 pt-6 pb-4">
        <h1 className="text-3xl font-bold">ランキング</h1>
        <div className="flex gap-2">
          <FilterChip onClick={() => setSheet('month')}>{monthLabel(month)}</FilterChip>
          {type === 'city' ? (
            <FilterChip icon={MapPin} onClick={() => setSheet('prefecture')}>
              {prefecture}
            </FilterChip>
          ) : null}
        </div>
        <RankTypeTabs value={type} options={SEGMENTS} onChange={changeType}>
          {type === 'blood' ? <AppNotice>「答えない」は順位に出しません。</AppNotice> : null}
          {error ? <AppNotice tone="error">{error}</AppNotice> : null}
          <div className="rounded-3xl bg-card px-4 py-4">
            <RankList items={shown} />
          </div>
        </RankTypeTabs>
      </div>
      <BottomNav tab={tab} onChange={onTab} />

      {sheet === 'month' ? (
        <ChoiceSheet
          title="期間"
          options={months.map((value) => ({
            value,
            label: `${monthLabel(value)}${value === thisMonth ? '（今月）' : ''}`,
          }))}
          selected={month}
          onChoose={chooseMonth}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === 'prefecture' ? (
        <ChoiceSheet
          title="地域"
          options={prefectures.map((name) => ({ value: name, label: name }))}
          selected={prefecture}
          note="ランキングは市区町村ごとに集計しています。選んだ月の上位20件に出てくる都道府県から選べます。"
          onChoose={choosePrefecture}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </main>
  );
}
