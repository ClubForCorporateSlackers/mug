import { call, event, GOOD_TOKEN, setup, SUB } from './fakes';
import type { CommentItem } from '../lambda/api/comments';
import { cellSize, encodeGeohash, JITTER_TRIES, jitterWithinCell } from '../lambda/api/geo';
import { nowJst } from '../lambda/api/http';
import type { PinItem } from '../lambda/api/pins';
import { ulid } from '../lambda/api/ulid';
import type { UserItem } from '../lambda/api/users';

// PATCH /api/pins/{pinId}・DELETE /api/pins/{pinId} のテスト（偽物の DB・地理院API を使う）。
// 決めたことは docs/adr/feature-api-pins-edit.md。

const KOMATSU: UserItem = { userId: SUB, nickname: 'こまつ', bloodType: 'A', createdAt: 'x', updatedAt: 'x', pinCount: 3 };
const OTHER = 'other-sub-999';

// 立てたのは10月（今は 2026-11-17 の設定）。ランキングは「立てた月」の分を直すことを確かめるため
const CREATED = new Date('2026-10-20T01:00:00Z');
const ORIGINAL = { lat: 35.68123, lng: 139.76712 };

function makePin(over: Partial<PinItem> = {}, time = CREATED): PinItem {
  const pinId = ulid(time.getTime());
  const createdAt = nowJst(time);
  return {
    cell: encodeGeohash(35.6815, 139.7668),
    sk: `${createdAt}#${pinId}`,
    pinId,
    lat: 35.6815,
    lng: 139.7668,
    city: '東京都千代田区',
    cityCode: '13101',
    stamp: 'kayui',
    memo: 'ベンチ',
    userId: SUB,
    bloodType: 'A',
    commentCount: 1,
    reactions: { odaiji: 1 },
    createdAt,
    ...over,
  };
}

const publicId = (p: PinItem) => `${p.cell}-${p.pinId}`;

// token に null を渡すと、トークンなし（ログインしていない）
function patch(p: PinItem | string, body: unknown, token: string | null = GOOD_TOKEN) {
  return event('PATCH', `/api/pins/${typeof p === 'string' ? p : publicId(p)}`, { token: token ?? undefined, body });
}
function del(p: PinItem | string, token: string | null = GOOD_TOKEN) {
  return event('DELETE', `/api/pins/${typeof p === 'string' ? p : publicId(p)}`, { token: token ?? undefined });
}

// ランキングの行を用意する（10月の分）
function seedRankings(rankings: Map<string, { label: string; count: number }>, rows: Record<string, number>) {
  for (const [k, count] of Object.entries(rows)) rankings.set(k, { label: k, count });
}

describe('PATCH /api/pins/{pinId}', () => {
  test('スタンプとメモだけ変える。返す形は POST と同じで、userId・ニックネーム・血液型は返さない', async () => {
    const pin = makePin();
    const { handler, pinStore, geocodeCalls } = setup({ users: [KOMATSU], pins: [pin] });
    const res = await call(handler, patch(pin, { stamp: 'itai', memo: ' 川のそば ' }));

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['city', 'createdAt', 'lat', 'lng', 'memo', 'pinId', 'stamp']);
    expect(res.body).toEqual({
      pinId: publicId(pin),
      lat: pin.lat,
      lng: pin.lng,
      city: '東京都千代田区',
      stamp: 'itai',
      memo: '川のそば',
      createdAt: pin.createdAt,
    });
    expect(JSON.stringify(res.body)).not.toContain(SUB);
    expect(pinStore[0]).toMatchObject({ stamp: 'itai', memo: '川のそば', lat: pin.lat, sk: pin.sk, commentCount: 1 });
    expect(geocodeCalls).toHaveLength(0); // 位置を送らなければ地理院APIは呼ばない
  });

  test('送らなかった項目は変えない。stamp: null でスタンプを外し、memo: null は "" にする', async () => {
    const pin = makePin();
    const { handler, pinStore } = setup({ pins: [pin] });
    expect((await call(handler, patch(pin, { stamp: null }))).body).toMatchObject({ stamp: null, memo: 'ベンチ' });
    expect((await call(handler, patch(pin, { memo: null }))).body).toMatchObject({ stamp: null, memo: '' });
    expect(pinStore[0]).toMatchObject({ stamp: null, memo: '' });
  });

  test('位置を送ると、サーバーでもう一度ずらし、市町村も判定し直す。元の座標は保存も返却もしない', async () => {
    const pin = makePin();
    const { handler, pinStore, geocodeCalls } = setup({ pins: [pin] });
    const res = await call(handler, patch(pin, ORIGINAL));

    expect(res.status).toBe(200);
    const saved = pinStore[0];
    expect(saved.lat).not.toBe(ORIGINAL.lat);
    expect(saved.lng).not.toBe(ORIGINAL.lng);
    expect(JSON.stringify(saved)).not.toContain(String(ORIGINAL.lat));
    expect(JSON.stringify(res.body)).not.toContain(String(ORIGINAL.lng));
    expect(geocodeCalls).toEqual([{ lat: saved.lat, lng: saved.lng }]);
    // 区画・sk・pinId は変わらない
    expect(encodeGeohash(saved.lat, saved.lng)).toBe(pin.cell);
    expect({ cell: saved.cell, sk: saved.sk }).toEqual({ cell: pin.cell, sk: pin.sk });
    expect(res.body.pinId).toBe(publicId(pin));
  });

  test('ずらした位置が別の区画になるなら 400（何も変えず、地理院APIも呼ばない）', async () => {
    const pin = makePin();
    const { handler, pinStore, geocodeCalls } = setup({ pins: [pin] });
    const res = await call(handler, patch(pin, { lat: 34.69, lng: 135.5 })); // 大阪
    expect(res).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
    expect(pinStore[0]).toEqual(pin);
    expect(geocodeCalls).toHaveLength(0);
  });

  test('市町村が変わったら、立てた月の市町村ランキングを付け替える', async () => {
    const pin = makePin();
    const { handler, rankings } = setup({ pins: [pin], city: { city: '東京都中央区', cityCode: '13102' } });
    seedRankings(rankings, { '2026-10#city|13101': 5 });
    const res = await call(handler, patch(pin, ORIGINAL));

    expect(res.body.city).toBe('東京都中央区');
    expect(rankings.get('2026-10#city|13101')?.count).toBe(4);
    expect(rankings.get('2026-10#city|13102')).toEqual({ label: '東京都中央区', count: 1 });
    expect([...rankings.keys()].some((k) => k.startsWith('2026-11#'))).toBe(false); // 今月の分は触らない
  });

  test('市町村が同じならランキングは変えない。不明になったら減らすだけ', async () => {
    const pin = makePin();
    const same = setup({ pins: [pin] });
    seedRankings(same.rankings, { '2026-10#city|13101': 5 });
    await call(same.handler, patch(pin, ORIGINAL));
    expect(same.rankings.get('2026-10#city|13101')?.count).toBe(5);

    const unknown = setup({ pins: [pin], city: { city: '不明', cityCode: null } });
    seedRankings(unknown.rankings, { '2026-10#city|13101': 5 });
    const res = await call(unknown.handler, patch(pin, ORIGINAL));
    expect(res.body.city).toBe('不明');
    expect(unknown.pinStore[0].cityCode).toBeNull();
    expect(unknown.rankings.get('2026-10#city|13101')?.count).toBe(4);
    expect(unknown.rankings.size).toBe(1);
  });

  test('ランキングの更新に失敗しても 200（ピンは書き換え済み）。ログに座標を出さない', async () => {
    const errors: string[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a.join(' ')));
    const pin = makePin();
    const fail = async () => {
      throw new Error('ProvisionedThroughputExceededException');
    };
    const { handler, pinStore } = setup({
      pins: [pin],
      city: { city: '東京都中央区', cityCode: '13102' },
      overrides: { rankings: { increment: fail, decrement: fail, list: async () => [] } },
    });
    const res = await call(handler, patch(pin, ORIGINAL));
    spy.mockRestore();

    expect(res.status).toBe(200);
    expect(errors.join('\n')).toContain('2件の件数の更新に失敗');
    for (const v of [ORIGINAL.lat, ORIGINAL.lng, pinStore[0].lat, pinStore[0].lng]) {
      expect(errors.join('\n')).not.toContain(String(v));
    }
  });

  test('ほかの人のピンは 403 NOT_OWNER（何も変えない）', async () => {
    const pin = makePin({ userId: OTHER });
    const { handler, pinStore } = setup({ pins: [pin] });
    const res = await call(handler, patch(pin, { memo: 'いたずら' }));
    expect(res).toMatchObject({ status: 403, body: { error: 'NOT_OWNER' } });
    expect(pinStore[0].memo).toBe('ベンチ');
  });

  test('ピンがなければ 404、pinId の形が違えば 404', async () => {
    const { handler } = setup({ pins: [] });
    expect((await call(handler, patch(makePin(), { memo: 'a' }))).status).toBe(404);
    expect((await call(handler, patch('not-a-pin', { memo: 'a' }))).body.error).toBe('NOT_FOUND');
  });

  test('ログインしていなければ 401', async () => {
    const pin = makePin();
    const { handler } = setup({ pins: [pin] });
    expect((await call(handler, patch(pin, { memo: 'a' }, null))).status).toBe(401);
  });

  test.each([
    ['変える項目がない', {}],
    ['緯度だけ', { lat: 35.68 }],
    ['経度だけ', { lng: 139.76 }],
    ['日本の範囲の外', { lat: 10, lng: 139.76 }],
    ['スタンプの種類が違う', { stamp: 'odaiji' }],
    ['メモが101文字', { memo: 'あ'.repeat(101) }],
    ['配列', [1]],
  ])('入力が正しくなければ 400（%s）', async (_name, body) => {
    const pin = makePin();
    const { handler, pinStore } = setup({ pins: [pin] });
    const res = await call(handler, patch(pin, body));
    expect(res).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
    expect(pinStore[0]).toEqual(pin);
  });
});

describe('jitterWithinCell（区画の中でずらす）', () => {
  // 区画の北の境目のすぐ南（約50m）の点
  const size = cellSize();
  const cell = encodeGeohash(ORIGINAL.lat, ORIGINAL.lng);
  const northEdge = Math.ceil((ORIGINAL.lat + 90) / size.lat) * size.lat - 90;
  const nearEdge = { lat: northEdge - 0.00045, lng: ORIGINAL.lng };

  test('境目の外に出たら、ずらし直す', () => {
    // 1回目：北へ約100m（区画の外）→ 2回目：南へ約10m（区画の中）
    const seq = [0.9999, 0, 0.01, 0.5];
    let i = 0;
    const pos = jitterWithinCell(nearEdge.lat, nearEdge.lng, cell, () => seq[i++]);
    expect(i).toBe(4);
    expect(pos).toBeDefined();
    expect(encodeGeohash(pos!.lat, pos!.lng)).toBe(cell);
  });

  test(`${JITTER_TRIES}回とも区画の外なら undefined`, () => {
    let calls = 0;
    const alwaysNorth = () => (calls++ % 2 === 0 ? 0.9999 : 0);
    expect(jitterWithinCell(nearEdge.lat, nearEdge.lng, cell, alwaysNorth)).toBeUndefined();
    expect(calls).toBe(JITTER_TRIES * 2);
  });
});

describe('DELETE /api/pins/{pinId}', () => {
  function comment(pinId: string, n: number): CommentItem {
    return { pinId, sk: `2026-10-21T00:00:0${n}+09:00#C${n}`, commentId: `C${n}`, userId: OTHER, nickname: 'しばた', text: 'お大事に', createdAt: 'x' };
  }

  test('ピン・コメント・スタンプを消し、立てた月のランキング（人・市町村・血液型）と pinCount を1減らす', async () => {
    const pin = makePin();
    const otherPin = makePin({ userId: OTHER }, new Date('2026-10-21T01:00:00Z'));
    const { handler, pinStore, commentStore, reactionStore, rankings, store } = setup({
      users: [KOMATSU],
      pins: [pin, otherPin],
      comments: [comment(pin.pinId, 1), comment(pin.pinId, 2), comment(otherPin.pinId, 3)],
    });
    await call(handler, event('PUT', `/api/pins/${publicId(pin)}/reactions/odaiji`, { token: GOOD_TOKEN }));
    await call(handler, event('PUT', `/api/pins/${publicId(otherPin)}/reactions/kaite`, { token: GOOD_TOKEN }));
    seedRankings(rankings, {
      [`2026-10#user|${SUB}`]: 3,
      '2026-10#city|13101': 7,
      '2026-10#blood|A': 4,
      [`2026-11#user|${SUB}`]: 2, // 今月の分は変えない
    });

    const res = await call(handler, del(pin));

    expect(res).toEqual({ status: 200, body: { pinId: publicId(pin) } });
    expect(pinStore).toEqual([expect.objectContaining({ pinId: otherPin.pinId })]);
    expect(commentStore.map((c) => c.commentId)).toEqual(['C3']); // ほかのピンのコメントは残す
    expect([...reactionStore.keys()]).toEqual([`${otherPin.pinId}|kaite#${SUB}`]);
    expect(rankings.get(`2026-10#user|${SUB}`)?.count).toBe(2);
    expect(rankings.get('2026-10#city|13101')?.count).toBe(6);
    expect(rankings.get('2026-10#blood|A')?.count).toBe(3);
    expect(rankings.get(`2026-11#user|${SUB}`)?.count).toBe(2);
    expect(store.get(SUB)?.pinCount).toBe(2);
  });

  test('2回目は 404 で、件数を二重に減らさない', async () => {
    const pin = makePin();
    const { handler, rankings, store } = setup({ users: [KOMATSU], pins: [pin] });
    seedRankings(rankings, { [`2026-10#user|${SUB}`]: 3 });
    expect((await call(handler, del(pin))).status).toBe(200);
    expect((await call(handler, del(pin))).body.error).toBe('NOT_FOUND');
    expect(rankings.get(`2026-10#user|${SUB}`)?.count).toBe(2);
    expect(store.get(SUB)?.pinCount).toBe(2);
  });

  test('血液型は、立てたときの値（ピンに保存）で減らす。プロフィールを変えていても同じ', async () => {
    const pin = makePin({ bloodType: 'O' });
    const { handler, rankings } = setup({ users: [KOMATSU], pins: [pin] }); // 今のプロフィールは A
    seedRankings(rankings, { '2026-10#blood|O': 2, '2026-10#blood|A': 2 });
    await call(handler, del(pin));
    expect(rankings.get('2026-10#blood|O')?.count).toBe(1);
    expect(rankings.get('2026-10#blood|A')?.count).toBe(2);
  });

  test('血液型を持たない古いピンは、今のプロフィールの血液型で減らす', async () => {
    const pin = makePin({ bloodType: undefined });
    const { handler, rankings } = setup({ users: [KOMATSU], pins: [pin] });
    seedRankings(rankings, { '2026-10#blood|A': 2 });
    await call(handler, del(pin));
    expect(rankings.get('2026-10#blood|A')?.count).toBe(1);
  });

  test('件数はマイナスにしない（行がない・0件・pinCount がない）。市町村が不明なら市町村は触らない', async () => {
    const pin = makePin({ cityCode: null, city: '不明' });
    const { handler, rankings, store } = setup({ users: [{ ...KOMATSU, pinCount: undefined }], pins: [pin] });
    seedRankings(rankings, { [`2026-10#user|${SUB}`]: 0 });
    expect((await call(handler, del(pin))).status).toBe(200);
    expect(rankings.get(`2026-10#user|${SUB}`)?.count).toBe(0);
    expect(rankings.size).toBe(1); // マイナスの行を作らない
    expect(store.get(SUB)?.pinCount).toBeUndefined();
  });

  test('コメントを消す途中で失敗・時間切れでも 200（ピンは消し済み）。ログに残す', async () => {
    const errors: string[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a.join(' ')));
    const pin = makePin();
    const { handler, pinStore } = setup({
      users: [KOMATSU],
      pins: [pin],
      comments: [comment(pin.pinId, 1)],
      overrides: { deleteBudgetMs: -1 }, // 最初から時間切れ
    });
    const res = await call(handler, del(pin));
    spy.mockRestore();
    expect(res.status).toBe(200);
    expect(pinStore).toHaveLength(0);
    expect(errors.join('\n')).toContain('時間切れでコメントを消しきれませんでした（0件消した');
  });

  test('ピンを消したあとは、コメント一覧は 404', async () => {
    const pin = makePin();
    const { handler } = setup({ users: [KOMATSU], pins: [pin], comments: [comment(pin.pinId, 1)] });
    await call(handler, del(pin));
    expect((await call(handler, event('GET', `/api/pins/${publicId(pin)}/comments`))).status).toBe(404);
  });

  test('ほかの人のピンは 403 NOT_OWNER（消さない・件数も減らさない）', async () => {
    const pin = makePin({ userId: OTHER });
    const { handler, pinStore, rankings } = setup({ users: [KOMATSU], pins: [pin] });
    seedRankings(rankings, { '2026-10#city|13101': 7 });
    const res = await call(handler, del(pin));
    expect(res).toMatchObject({ status: 403, body: { error: 'NOT_OWNER' } });
    expect(pinStore).toHaveLength(1);
    expect(rankings.get('2026-10#city|13101')?.count).toBe(7);
  });

  test('ログインしていなければ 401、形が違う pinId は 404', async () => {
    const pin = makePin();
    const { handler, pinStore } = setup({ users: [KOMATSU], pins: [pin] });
    expect((await call(handler, del(pin, null))).status).toBe(401);
    expect((await call(handler, del('xn76-bad'))).status).toBe(404);
    expect(pinStore).toHaveLength(1);
  });
});

describe('POST /api/pins で血液型を保存する', () => {
  test('立てたときの血液型をピンに保存し、地図の API では返さない', async () => {
    const { handler, pinStore } = setup({ users: [KOMATSU] });
    await call(handler, event('POST', '/api/pins', { token: GOOD_TOKEN, body: ORIGINAL }));
    expect(pinStore[0].bloodType).toBe('A');

    const p = pinStore[0];
    const list = await call(
      handler,
      event('GET', '/api/pins', {
        query: { minLat: String(p.lat - 0.01), maxLat: String(p.lat + 0.01), minLng: String(p.lng - 0.01), maxLng: String(p.lng + 0.01) },
      }),
    );
    expect(list.body.pins).toHaveLength(1);
    expect(list.body.pins[0]).not.toHaveProperty('bloodType');
    expect(JSON.stringify(list.body)).not.toContain('"A"');
  });
});
