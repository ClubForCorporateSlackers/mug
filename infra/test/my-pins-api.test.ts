import { call, event, GOOD_TOKEN, setup, SUB } from './fakes';
import { encodeGeohash } from '../lambda/api/geo';
import { nowJst } from '../lambda/api/http';
import type { PinItem } from '../lambda/api/pins';
import { ulid } from '../lambda/api/ulid';

// GET /api/me/pins のテスト（偽物の DB を使う）。決めたことは docs/adr/feature-api-my-pins.md。

const OTHER = 'other-sub-999';

// i 分後に立てたピン（i が大きいほど新しい）
function makePin(i: number, over: Partial<PinItem> = {}): PinItem {
  const time = new Date(Date.UTC(2026, 10, 1, 0, i));
  const pinId = ulid(time.getTime());
  const createdAt = nowJst(time);
  const lat = 35.6815 + i * 0.0001;
  return {
    cell: encodeGeohash(lat, 139.7668),
    sk: `${createdAt}#${pinId}`,
    pinId,
    lat,
    lng: 139.7668,
    city: '東京都千代田区',
    cityCode: '13101',
    stamp: 'kayui',
    memo: `メモ${i}`,
    userId: SUB,
    bloodType: 'A',
    commentCount: 2,
    reactions: { odaiji: 3, kaite: 0 },
    createdAt,
    ...over,
  };
}

const get = (token: string | null = GOOD_TOKEN) => event('GET', '/api/me/pins', { token: token ?? undefined });

test('自分のピンだけを新しい順に返す。形は GET /api/pins と同じで、userId・ニックネーム・血液型・市町村コードは返さない', async () => {
  const mine1 = makePin(1);
  const mine2 = makePin(2, { stamp: null, memo: '' });
  const others = makePin(3, { userId: OTHER });
  const { handler } = setup({ pins: [mine1, others, mine2] });
  const res = await call(handler, get());

  expect(res.status).toBe(200);
  expect(Object.keys(res.body)).toEqual(['pins']);
  expect(res.body.pins).toEqual([
    {
      pinId: `${mine2.cell}-${mine2.pinId}`,
      lat: mine2.lat,
      lng: mine2.lng,
      city: '東京都千代田区',
      stamp: null,
      memo: '',
      createdAt: mine2.createdAt,
      commentCount: 2,
      reactions: { odaiji: 3 }, // 0件の種類は返さない
    },
    expect.objectContaining({ pinId: `${mine1.cell}-${mine1.pinId}`, memo: 'メモ1' }),
  ]);
  const text = JSON.stringify(res.body);
  for (const word of ['userId', 'nickname', 'bloodType', 'cityCode', SUB, OTHER]) {
    expect(text).not.toContain(word);
  }
});

test('最大100件（新しいほうから）', async () => {
  const pins = Array.from({ length: 120 }, (_, i) => makePin(i));
  const { handler } = setup({ pins });
  const res = await call(handler, get());

  expect(res.status).toBe(200);
  expect(res.body.pins).toHaveLength(100);
  expect(res.body.pins[0].memo).toBe('メモ119');
  expect(res.body.pins[99].memo).toBe('メモ20');
});

test('ピンがなければ空の一覧。プロフィール未登録でも 200', async () => {
  const { handler } = setup({ pins: [makePin(1, { userId: OTHER })] });
  const res = await call(handler, get());
  expect(res).toEqual({ status: 200, body: { pins: [] } });
});

test('末尾の / があっても同じ', async () => {
  const { handler } = setup({ pins: [makePin(1)] });
  const res = await call(handler, event('GET', '/api/me/pins/', { token: GOOD_TOKEN }));
  expect(res.status).toBe(200);
  expect(res.body.pins).toHaveLength(1);
});

test.each([
  ['トークンなし', null],
  ['正しくないトークン', 'bad-token'],
])('%s なら 401', async (_name, token) => {
  const { handler } = setup({ pins: [makePin(1)] });
  const res = await call(handler, get(token));
  expect(res.status).toBe(401);
  expect(JSON.stringify(res.body)).not.toContain('メモ1');
});
