import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { cn } from 'cn';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { BottomSheet } from '@/components/BottomSheet';
import { RankList } from '@/components/RankList';
import { api } from '@/lib/api';
import { currentMonth, monthLabel, prefectureName, shiftMonth } from '@/lib/labels';
import type { TabName } from '@/lib/route';
import type { RankItem, RankType } from '@/lib/types';

const SEGMENTS: { id: RankType; label: string }[] = [
  { id: 'city', label: '刺された回数' },
  { id: 'blood', label: '血液型別' },
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
  const [sheet, setSheet] = useState<'filter' | 'prefecture' | null>(null);
  const [draftMonth, setDraftMonth] = useState(month);
  const [draftPrefecture, setDraftPrefecture] = useState(prefecture);

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

  function openFilter() {
    setDraftMonth(month);
    setDraftPrefecture(prefecture);
    setSheet('filter');
  }

  function applyFilter() {
    if (draftMonth !== month) setItems([]);
    setMonth(draftMonth);
    setPrefecture(draftPrefecture);
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
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-card px-3 py-2 text-sm font-bold"
            onClick={openFilter}
          >
            {monthLabel(month)}
            <ChevronDown className="size-4" aria-hidden />
          </button>
          {type === 'city' ? (
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-card px-3 py-2 text-sm font-bold"
              onClick={openFilter}
            >
              {prefecture}
              <ChevronDown className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 rounded-full bg-muted p-1" role="tablist">
          {SEGMENTS.map((segment) => (
            <button
              key={segment.id}
              type="button"
              role="tab"
              aria-selected={type === segment.id}
              className={cn('rounded-full py-2 text-sm font-bold', type === segment.id && 'bg-card')}
              onClick={() => changeType(segment.id)}
            >
              {segment.label}
            </button>
          ))}
        </div>
        {type === 'blood' ? <AppNotice>「答えない」は順位に出しません。</AppNotice> : null}
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <div className="rounded-3xl bg-card px-4 py-4">
          <RankList items={shown} />
        </div>
      </div>
      <BottomNav tab={tab} onChange={onTab} />

      {sheet === 'filter' ? (
        <BottomSheet label="絞り込み" onClose={() => setSheet(null)}>
          <div className="flex items-center justify-between">
            <button type="button" className="font-bold text-primary" onClick={() => setSheet(null)}>
              閉じる
            </button>
            <h2 className="font-bold">絞り込み</h2>
            <button type="button" className="font-bold text-primary" onClick={applyFilter}>
              完了
            </button>
          </div>
          <h3 className="mt-4 mb-1 text-sm font-bold">期間</h3>
          <ul className="divide-y">
            {months.map((value) => (
              <li key={value}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3 text-left"
                  aria-pressed={draftMonth === value}
                  onClick={() => setDraftMonth(value)}
                >
                  {monthLabel(value)}
                  {value === thisMonth ? '（今月）' : ''}
                  {draftMonth === value ? <Check className="ml-auto size-5 text-primary" aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
          {type === 'city' ? (
            <>
              <h3 className="mt-4 mb-1 text-sm font-bold">地域</h3>
              <button
                type="button"
                className="flex w-full items-center gap-3 py-3 text-left font-bold"
                onClick={() => setSheet('prefecture')}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-secondary">
                  <MapPin className="size-5" aria-hidden />
                </span>
                <span className="flex-1">都道府県</span>
                <span className="text-sm text-muted-foreground">{draftPrefecture}</span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </button>
              <p className="text-xs text-muted-foreground">ランキングは市区町村ごとに集計しています。</p>
            </>
          ) : null}
        </BottomSheet>
      ) : null}

      {sheet === 'prefecture' ? (
        <BottomSheet label="都道府県を選ぶ" onClose={() => setSheet('filter')}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid size-9 place-items-center"
              aria-label="戻る"
              onClick={() => setSheet('filter')}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <h2 className="font-bold">都道府県を選ぶ</h2>
          </div>
          <ul className="mt-2 divide-y">
            {prefectures.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="flex w-full items-center py-3 text-left"
                  aria-pressed={draftPrefecture === name}
                  onClick={() => {
                    setDraftPrefecture(name);
                    setSheet('filter');
                  }}
                >
                  {name}
                  {draftPrefecture === name ? <Check className="ml-auto size-5 text-primary" aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">選んだ月の上位20件に出てくる都道府県です。</p>
        </BottomSheet>
      ) : null}
    </main>
  );
}
