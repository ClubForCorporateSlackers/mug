import { useEffect, useState } from 'react';
import { RankingTabs, type RankingSection } from '@/components/RankingTabs';
import { api } from '@/lib/api';
import type { RankingResponse, RankingType } from '@/lib/api-types';

const TYPES: RankingType[] = ['user', 'city', 'blood'];
const LOADING: RankingSection = { items: [], loading: true, error: null };

// ランキングの画面（ログイン不要）。今月の3種類を GET /api/rankings で取る
export function RankingPage() {
  const [month, setMonth] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<RankingType, RankingSection>>({
    user: LOADING,
    city: LOADING,
    blood: LOADING,
  });

  useEffect(() => {
    let cancelled = false;
    // Lambda には同時実行数の上限がある（infra/lib/mug-stack.ts）。何人かが同時に開いても
    // 「Rate Exceeded」になりにくいよう、3つを同時ではなく1つずつ順番に呼ぶ
    async function loadAll() {
      for (const type of TYPES) {
        try {
          // month を省略すると、サーバーが日本時間の今月を返す
          const data = await api<RankingResponse>('GET', `/api/rankings?type=${type}`);
          if (cancelled) return;
          setMonth(data.month);
          setSections((s) => ({ ...s, [type]: { items: data.items, loading: false, error: null } }));
        } catch (e) {
          if (cancelled) return;
          const message = e instanceof Error ? e.message : '不明なエラー';
          setSections((s) => ({ ...s, [type]: { items: [], loading: false, error: message } }));
        }
      }
    }
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex flex-1 justify-center overflow-y-auto p-4">
      <RankingTabs month={month} sections={sections} />
    </main>
  );
}
