import { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { BloodChart } from '@/components/BloodChart';
import { BottomSheet } from '@/components/BottomSheet';
import { FilterChip } from '@/components/FilterChip';
import { OptionLinkRow } from '@/components/OptionLinkRow';
import { OptionList } from '@/components/OptionList';
import { PageTitle } from '@/components/PageTitle';
import { RankHighlight } from '@/components/RankHighlight';
import { RankList } from '@/components/RankList';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SheetNav } from '@/components/SheetNav';
import { TabBar } from '@/components/TabBar';
import { AppNotice } from '@/components/AppNotice';
import { api } from '@/lib/api';
import { idToken } from '@/lib/auth';
import { PREFECTURES, bloodLabel, currentMonth, monthLabel, recentMonths } from '@/lib/labels';
import type { TabName } from '@/lib/route';
import type { Profile, RankItem, RankType } from '@/lib/types';

// 種類は人・市町村・血液型の3つ（docs/decisions.md #10）
const TYPES: { value: RankType; label: string }[] = [
  { value: 'user', label: '人' },
  { value: 'city', label: '市町村' },
  { value: 'blood', label: '血液型' },
];
const ALL = 'すべて';

type Props = { guest: boolean; onTab: (tab: TabName) => void };

// C1〜C4 ランキング
export function RankingPage({ guest, onTab }: Props) {
  const [type, setType] = useState<RankType>('city');
  const [month, setMonth] = useState(currentMonth);
  const [prefecture, setPrefecture] = useState(ALL);
  const [items, setItems] = useState<RankItem[]>([]);
  // 読み込み済みの「種類と月」。いまの組み合わせと違えば読み込み中
  const [loaded, setLoaded] = useState('');
  const [error, setError] = useState('');
  const [myBlood, setMyBlood] = useState('');
  // 絞り込みのシート。filter が C3、prefecture が C4
  const [sheet, setSheet] = useState<'closed' | 'filter' | 'prefecture'>('closed');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let stop = false;
    const key = `${type}-${month}`;
    api<{ items: RankItem[] }>('GET', `/api/rankings?type=${type}&month=${month}`)
      .then((data) => {
        if (stop) return;
        setItems(data.items);
        setError('');
      })
      .catch((err: unknown) => {
        if (!stop) setError(err instanceof Error ? err.message : '読み込めませんでした');
      })
      .finally(() => {
        if (!stop) setLoaded(key);
      });
    return () => {
      stop = true;
    };
  }, [type, month]);
  const loading = loaded !== `${type}-${month}`;

  useEffect(() => {
    if (guest) return;
    void (async () => {
      try {
        const profile = await api<Profile>('GET', '/api/me', { idToken: await idToken() });
        if (profile.bloodType !== 'UNKNOWN') setMyBlood(bloodLabel(profile.bloodType));
      } catch {
        setMyBlood('');
      }
    })();
  }, [guest]);

  // 都道府県の絞り込みは、返ってきた上位20件に対して画面側で行う（API に都道府県の指定がない）
  const shown =
    type === 'city' && prefecture !== ALL ? items.filter((item) => item.label.startsWith(prefecture)) : items;
  const prefectures = useMemo(() => [ALL, ...PREFECTURES].filter((name) => name.includes(search.trim())), [search]);

  return (
    <Screen withTabBar>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        <PageTitle title="ランキング" size="xl" />
        <div className="flex gap-2">
          <FilterChip onClick={() => setSheet('filter')}>{monthLabel(month)}</FilterChip>
          {type === 'city' ? <FilterChip onClick={() => setSheet('prefecture')}>{prefecture}</FilterChip> : null}
        </div>
        <SegmentedControl label="ランキングの種類" options={TYPES} value={type} onChange={setType} />
        {type === 'city' ? (
          // TODO(API): いまいる市町村の順位（現在地の市町村を返す API が必要）
          <RankHighlight eyebrow="いまいる市町村の順位" title="準備中です" note="API の追加を待っています" />
        ) : null}
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        {type === 'blood' ? (
          <>
            <BloodChart
              title="血液型ごとの刺された回数"
              unit="回"
              items={shown}
              // TODO(API): 自分の今月の回数、1人あたりの平均（Figma C2）
              footer={myBlood ? `あなた（${myBlood}）の今月の回数は準備中です` : undefined}
            />
            <p className="text-xs font-medium text-muted-foreground">
              ※ 登録された血液型をもとに集計しています。「答えない」は出しません。
            </p>
          </>
        ) : (
          <RankList items={shown} unit="回" loading={loading} />
        )}
      </div>
      <TabBar tab="ranking" onChange={onTab} />

      <BottomSheet open={sheet !== 'closed'} onClose={() => setSheet('closed')} title="絞り込み" className="h-[80svh]">
        {sheet === 'filter' ? (
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4">
            <SheetNav
              title="絞り込み"
              leadingLabel="閉じる"
              onLeading={() => setSheet('closed')}
              trailingLabel="完了"
              onTrailing={() => setSheet('closed')}
            />
            <p className="text-[13px] font-bold text-muted-foreground">期間</p>
            <OptionList
              label="期間"
              options={recentMonths(6).map((value, index) => ({
                value,
                label: index === 0 ? `${monthLabel(value)}（今月）` : monthLabel(value),
              }))}
              value={month}
              onSelect={setMonth}
            />
            {type === 'city' ? (
              <>
                <p className="text-[13px] font-bold text-muted-foreground">地域</p>
                <OptionLinkRow
                  icon={MapPin}
                  label="都道府県"
                  value={prefecture}
                  onClick={() => setSheet('prefecture')}
                />
                <p className="text-xs font-medium text-muted-foreground">ランキングは市区町村ごとに集計しています。</p>
              </>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-0 flex-col gap-3 px-4 pt-2 pb-4">
            <SheetNav title="都道府県" leadingLabel="絞り込み" leadingBack onLeading={() => setSheet('filter')} />
            <SearchField value={search} onChange={setSearch} placeholder="都道府県を検索" />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OptionList
                label="都道府県"
                // TODO(API): 「現在地（東京都）」は現在地の都道府県を返す API ができたら足す
                options={prefectures.map((name) => ({
                  value: name,
                  label: name,
                  icon: name === ALL ? Navigation : undefined,
                }))}
                value={prefecture}
                onSelect={(value) => {
                  setPrefecture(value);
                  setSheet('closed');
                }}
              />
            </div>
          </div>
        )}
      </BottomSheet>
    </Screen>
  );
}
