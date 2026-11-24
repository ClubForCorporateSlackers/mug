import { call, event, setup } from './fakes';
import type { RankingEntry } from '../lambda/api/pins';

// GET /api/rankings のテスト（偽物の DB を使う）。

const get = (query?: Record<string, string>) => event('GET', '/api/rankings', { query });

// Rankings に件数を入れた状態を作る（キー：月#種類|key）
function withCounts(month: string, kind: string, entries: RankingEntry[]) {
  const s = setup();
  for (const e of entries) s.rankings.set(`${month}#${kind}|${e.key}`, { label: e.label, count: e.count });
  return s;
}

describe('GET /api/rankings', () => {
  test('ログインなしで、件数の多い順に返す。同じ件数は同じ順位（1, 2, 2, 4）', async () => {
    const { handler } = withCounts('2026-11', 'user', [
      { key: 'u1', label: 'Jiji824', count: 3 },
      { key: 'u2', label: 'kokokoko0825', count: 12 },
      { key: 'u3', label: 'shibatanaoto0428', count: 8 },
      { key: 'u4', label: 'すずき', count: 8 },
    ]);
    const res = await call(handler, get({ type: 'user', month: '2026-11' }));
    expect(res).toEqual({
      status: 200,
      body: {
        type: 'user',
        month: '2026-11',
        items: [
          { rank: 1, label: 'kokokoko0825', count: 12 },
          { rank: 2, label: 'shibatanaoto0428', count: 8 },
          { rank: 2, label: 'すずき', count: 8 },
          { rank: 4, label: 'Jiji824', count: 3 },
        ],
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('u1'); // userId は返さない
  });

  test('上位20件まで', async () => {
    const entries = Array.from({ length: 25 }, (_, i) => ({ key: `13${String(i).padStart(3, '0')}`, label: `市${i}`, count: i + 1 }));
    const { handler } = withCounts('2026-11', 'city', entries);
    const res = await call(handler, get({ type: 'city', month: '2026-11' }));
    expect(res.body.items).toHaveLength(20);
    expect(res.body.items[0]).toEqual({ rank: 1, label: '市24', count: 25 });
    expect(res.body.items[19]).toEqual({ rank: 20, label: '市5', count: 6 });
  });

  test('全員同じ件数なら全員1位', async () => {
    const { handler } = withCounts('2026-11', 'city', [
      { key: '13101', label: '東京都千代田区', count: 2 },
      { key: '13102', label: '東京都中央区', count: 2 },
    ]);
    const res = await call(handler, get({ type: 'city', month: '2026-11' }));
    expect(res.body.items.map((i: { rank: number }) => i.rank)).toEqual([1, 1]);
  });

  test('血液型は「答えない（UNKNOWN）」を出さない', async () => {
    const { handler } = withCounts('2026-11', 'blood', [
      { key: 'A', label: 'A型', count: 5 },
      { key: 'UNKNOWN', label: '不明', count: 9 },
      { key: 'O', label: 'O型', count: 5 },
    ]);
    const res = await call(handler, get({ type: 'blood', month: '2026-11' }));
    expect(res.body.items).toEqual([
      { rank: 1, label: 'A型', count: 5 },
      { rank: 1, label: 'O型', count: 5 },
    ]);
  });

  test('ほかの月・ほかの種類は混ざらない', async () => {
    const s = withCounts('2026-10', 'user', [{ key: 'u1', label: 'Jiji824', count: 3 }]);
    s.rankings.set('2026-11#city|13101', { label: '東京都千代田区', count: 1 });
    const res = await call(s.handler, get({ type: 'user', month: '2026-11' }));
    expect(res.body.items).toEqual([]);
  });

  test('month を省略したら日本時間の今月（UTC では前の月の 11/30 15:00 → 12月）', async () => {
    const { handler } = setup({ overrides: { now: () => new Date('2026-11-30T15:00:00Z') } });
    const res = await call(handler, get({ type: 'city' }));
    expect(res.body).toEqual({ type: 'city', month: '2026-12', items: [] });
  });

  test('ピンを立てるとランキングに出る', async () => {
    const s = setup({
      users: [{ userId: 'user-sub-123', nickname: 'Jiji824', bloodType: 'B', createdAt: 'x', updatedAt: 'x' }],
    });
    await call(s.handler, event('POST', '/api/pins', { token: 'good-token', body: { lat: 35.68, lng: 139.76 } }));
    const blood = await call(s.handler, get({ type: 'blood' }));
    expect(blood.body).toEqual({ type: 'blood', month: '2026-11', items: [{ rank: 1, label: 'B型', count: 1 }] });
    const city = await call(s.handler, get({ type: 'city' }));
    expect(city.body.items).toEqual([{ rank: 1, label: '東京都千代田区', count: 1 }]);
  });

  test.each([
    ['type なし', undefined],
    ['type が違う', { type: 'pref' }],
    ['month の形が違う', { type: 'user', month: '2026-1' }],
    ['13月', { type: 'user', month: '2026-13' }],
    ['00月', { type: 'user', month: '2026-00' }],
    ['日付まで', { type: 'user', month: '2026-11-01' }],
    ['空の month', { type: 'user', month: '' }],
  ])('%s は 400 VALIDATION_ERROR', async (_name, query) => {
    const { handler } = setup();
    expect(await call(handler, get(query))).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
  });
});
