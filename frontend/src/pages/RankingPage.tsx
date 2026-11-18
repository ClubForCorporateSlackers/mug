import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { RankList } from '@/components/RankList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/lib/api';
import { currentMonth, monthLabel, prefectureName, shiftMonth } from '@/lib/labels';
import type { TabName } from '@/lib/route';
import type { RankItem, RankType } from '@/lib/types';

const TYPES: { id: RankType; label: string }[] = [
  { id: 'user', label: '人' },
  { id: 'city', label: '市町村' },
  { id: 'blood', label: '血液型' },
];

type Props = { tab: TabName; onTab: (tab: TabName) => void };

export function RankingPage({ tab, onTab }: Props) {
  const [type, setType] = useState<RankType>('city');
  const [month, setMonth] = useState(currentMonth);
  const [items, setItems] = useState<RankItem[]>([]);
  const [error, setError] = useState('');
  const [prefecture, setPrefecture] = useState('すべて');

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
    for (const item of items) {
      const name = prefectureName(item.label);
      if (name) names.add(name);
    }
    return ['すべて', ...names];
  }, [items]);

  const shown =
    type === 'city' && prefecture !== 'すべて' ? items.filter((item) => item.label.startsWith(prefecture)) : items;

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="ランキング" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
        <div className="flex items-center justify-between font-bold">
          <button
            type="button"
            aria-label="前の月"
            onClick={() => {
              setMonth((value) => shiftMonth(value, -1));
              setItems([]);
            }}
          >
            <ChevronLeft />
          </button>
          <span>{monthLabel(month)}</span>
          <button
            type="button"
            aria-label="次の月"
            onClick={() => {
              setMonth((value) => shiftMonth(value, 1));
              setItems([]);
            }}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2" role="tablist">
          {TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={type === item.id}
              className={
                type === item.id
                  ? 'rounded-full bg-foreground py-2 text-sm font-bold text-card'
                  : 'rounded-full bg-card py-2 text-sm font-bold'
              }
              onClick={() => {
                setType(item.id);
                setItems([]);
                setPrefecture('すべて');
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        {type === 'city' ? (
          <label className="flex flex-col gap-1 text-sm font-bold">
            都道府県
            <select
              className="h-11 rounded-2xl border bg-card px-3"
              value={prefecture}
              onChange={(event) => setPrefecture(event.target.value)}
            >
              {prefectures.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        ) : null}
        {type === 'blood' ? <AppNotice>「答えない」は順位に出しません。</AppNotice> : null}
        {error ? <AppNotice tone="error">{error}</AppNotice> : <RankList items={shown} />}
      </div>
      <BottomNav tab={tab} onChange={onTab} />
    </main>
  );
}
