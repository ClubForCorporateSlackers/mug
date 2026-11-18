import { useEffect, useState } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { EmptyState } from '@/components/EmptyState';
import { MyPinCard } from '@/components/MyPinCard';
import { NavBar } from '@/components/NavBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { idToken } from '@/lib/auth';
import { formatWhen, monthLabel, stampLabel } from '@/lib/labels';
import type { Pin } from '@/lib/types';

type Props = { onBack: () => void; onMap: () => void; onOpenPin: (pin: Pin) => void };

// 月ごとにまとめる（新しい順のまま）
function byMonth(pins: Pin[]): [string, Pin[]][] {
  const groups = new Map<string, Pin[]>();
  for (const pin of pins) {
    const month = pin.createdAt.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), pin]);
  }
  return [...groups];
}

// D2・D3 自分のピン一覧。GET /api/me/pins（docs/api-spec.md の #12）
export function MyPinsPage({ onBack, onMap, onOpenPin }: Props) {
  const [pins, setPins] = useState<Pin[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setPins((await api<{ pins: Pin[] }>('GET', '/api/me/pins', { idToken: await idToken() })).pins);
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込めませんでした');
      }
    })();
  }, []);

  return (
    <Screen>
      <NavBar backLabel="マイページ" onBack={onBack} title="自分のピン" />
      {error ? (
        <div className="px-4 pt-4">
          <AppNotice tone="error">{error}</AppNotice>
        </div>
      ) : null}
      {pins === null && !error ? (
        <div className="px-4 pt-4">
          <AppNotice>読み込み中…</AppNotice>
        </div>
      ) : null}
      {pins?.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center pb-24">
          <EmptyState
            title="まだピンはありません"
            body="刺されたら、マップの「ここで刺された！」からすぐに投稿できます。"
            actionLabel="マップへ戻る"
            onAction={onMap}
          />
        </div>
      ) : null}
      {pins && pins.length > 0 ? (
        <div className="flex flex-col gap-3 px-4 pt-4 pb-6">
          {byMonth(pins).map(([month, list]) => (
            <section key={month} className="flex flex-col gap-3" aria-label={monthLabel(month)}>
              <SectionHeader title={monthLabel(month)} />
              {list.map((pin) => (
                <MyPinCard
                  key={pin.pinId}
                  place={pin.city || '場所不明'}
                  when={formatWhen(pin.createdAt)}
                  stamp={pin.stamp}
                  stampLabel={stampLabel(pin.stamp)}
                  memo={pin.memo}
                  odaiji={pin.reactions?.odaiji ?? 0}
                  onClick={() => onOpenPin(pin)}
                />
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </Screen>
  );
}
