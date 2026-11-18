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
import { currentPosition } from '@/lib/location';
import type { Area, Profile, RankItem, RankType } from '@/lib/types';

// 種類は人・市町村・血液型の3つ（docs/decisions.md #10）
const TYPES: { value: RankType; label: string }[] = [
  { value: 'user', label: '人' },
  { value: 'city', label: '市町村' },
  { value: 'blood', label: '血液型' },
];
const ALL = 'すべて';

type Props = { onTab: (tab: TabName) => void };

// C1〜C4 ランキング
export function RankingPage({ onTab }: Props) {
  const [type, setType] = useState<RankType>('city');
  const [month, setMonth] = useState(currentMonth);
  const [prefecture, setPrefecture] = useState(ALL);
  // 読み込んだ結果と、その「種類・月・都道府県」。いまの組み合わせと違えば読み込み中
  const [result, setResult] = useState<{ key: string; items: RankItem[] }>({ key: '', items: [] });
  const [loaded, setLoaded] = useState('');
  const [error, setError] = useState('');
  const [me, setMe] = useState<Profile | null>(null);
  // いまいる市町村（GET /api/area。docs/api-spec.md の #14）
  const [here, setHere] = useState<Area | null>(null);
  // 絞り込みのシート。filter が C3、prefecture が C4
  const [sheet, setSheet] = useState<'closed' | 'filter' | 'prefecture'>('closed');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let stop = false;
    const key = `${type}-${month}-${prefecture}`;
    const query = new URLSearchParams({ type, month });
    // 都道府県は市町村ランキングのときだけ API に渡す（追加予定の prefecture）
    if (type === 'city' && prefecture !== ALL) query.set('prefecture', prefecture);
    api<{ items: RankItem[] }>('GET', `/api/rankings?${query}`)
      .then((data) => {
        if (stop) return;
        setResult({ key, items: data.items });
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
  }, [type, month, prefecture]);
  const currentKey = `${type}-${month}-${prefecture}`;
  const loading = loaded !== currentKey;
  // 切り替えた直後に、前の種類のデータ（例：市町村の20件）で血液型のグラフを描かないよう、いまの組み合わせの結果だけ使う
  const items = result.key === currentKey ? result.items : [];

  useEffect(() => {
    void (async () => {
      try {
        setMe(await api<Profile>('GET', '/api/me', { idToken: await idToken() }));
      } catch {
        setMe(null);
      }
    })();
    void (async () => {
      try {
        const point = await currentPosition();
        setHere(await api<Area>('GET', `/api/area?lat=${point.lat}&lng=${point.lng}`));
      } catch {
        setHere(null);
      }
    })();
  }, []);

  // API が都道府県で絞ってくれる。念のため画面でも同じ条件で絞る（結果は変わらない）
  const shown =
    type === 'city' && prefecture !== ALL ? items.filter((item) => item.label.startsWith(prefecture)) : items;
  // 血液型は、1人あたりの平均（追加予定の average）があればそれを、なければ件数を出す
  const hasAverage = type === 'blood' && shown.length > 0 && shown.every((item) => item.average !== undefined);
  const bloodItems = hasAverage ? shown.map((item) => ({ ...item, count: item.average ?? 0 })) : shown;
  const myBlood = me && me.bloodType !== 'UNKNOWN' ? bloodLabel(me.bloodType) : '';
  const prefectures = useMemo(() => [ALL, ...PREFECTURES].filter((name) => name.includes(search.trim())), [search]);
  const diff = here ? `先月より ${here.diffFromLastMonth >= 0 ? '+' : ''}${here.diffFromLastMonth}件` : undefined;

  return (
    <Screen withTabBar>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        <PageTitle title="ランキング" size="xl" />
        <div className="flex gap-2">
          <FilterChip onClick={() => setSheet('filter')}>{monthLabel(month)}</FilterChip>
          {type === 'city' ? <FilterChip onClick={() => setSheet('prefecture')}>{prefecture}</FilterChip> : null}
        </div>
        <SegmentedControl label="ランキングの種類" options={TYPES} value={type} onChange={setType} />
        {type === 'city' && here?.city && here.prefecture && here.prefectureRank ? (
          <RankHighlight
            eyebrow={`いまいる${here.city.replace(here.prefecture, '')}は`}
            title={`${here.prefecture}で ${here.prefectureRank}位`}
            note={diff}
          />
        ) : null}
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        {type === 'blood' ? (
          <>
            <BloodChart
              title={hasAverage ? '1人あたりの刺され回数（平均）' : '血液型ごとの刺された回数'}
              unit="回"
              items={bloodItems}
              loading={loading}
              footer={
                myBlood && me?.monthCount !== undefined
                  ? `あなた（${myBlood}）は今月 ${me.monthCount}回 刺されています`
                  : undefined
              }
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
                options={[
                  // 「現在地（東京都）」。現在地の都道府県が分かったときだけ（#14）
                  ...(here?.prefecture && !search.trim()
                    ? [{ value: here.prefecture, label: `現在地（${here.prefecture}）`, icon: Navigation }]
                    : []),
                  ...prefectures.map((name) => ({ value: name, label: name })),
                ]}
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
