import { call, event, GOOD_TOKEN, setup, SUB } from './fakes';
import { encodeGeohash } from '../lambda/api/geo';
import type { PinItem } from '../lambda/api/pins';
import type { UserItem } from '../lambda/api/users';

// POST /api/pins・GET /api/pins のテスト（偽物の DB・地理院API を使う）。

const KOMATSU: UserItem = { userId: SUB, nickname: 'こまつ', bloodType: 'A', createdAt: 'x', updatedAt: 'x', pinCount: 2 };
const ORIGINAL = { lat: 35.68123, lng: 139.76712 };

function post(body: unknown, token: string | undefined = GOOD_TOKEN) {
  return event('POST', '/api/pins', { token, body });
}

describe('POST /api/pins', () => {
  test('ピンを立てると 201。ずらした位置・市町村を返し、userId とニックネームは返さない', async () => {
    const { handler, pinStore } = setup({ users: [KOMATSU] });
    const res = await call(handler, post({ ...ORIGINAL, stamp: 'kayui', memo: ' 公園のベンチ ' }));

    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(['city', 'createdAt', 'lat', 'lng', 'memo', 'pinId', 'stamp']);
    expect(res.body).toMatchObject({
      city: '東京都千代田区',
      stamp: 'kayui',
      memo: '公園のベンチ',
      createdAt: '2026-11-17T12:00:00+09:00',
    });
    // pinId は cell-ULID の形（docs/adr/feature-api-social.md）
    expect(res.body.pinId).toMatch(/^[0-9b-hjkmnp-z]{4}-[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(JSON.stringify(res.body)).not.toContain(SUB);
    expect(JSON.stringify(res.body)).not.toContain('こまつ');

    // 保存した中身
    expect(pinStore).toHaveLength(1);
    const saved = pinStore[0];
    expect(saved).toMatchObject({ userId: SUB, cityCode: '13101', commentCount: 0, reactions: {} });
    expect(saved.cell).toBe(encodeGeohash(saved.lat, saved.lng));
    expect(saved.sk).toBe(`${saved.createdAt}#${saved.pinId}`);
    expect(res.body.pinId).toBe(`${saved.cell}-${saved.pinId}`); // DB の pinId は ULID のまま
    expect({ lat: saved.lat, lng: saved.lng }).toEqual({ lat: res.body.lat, lng: res.body.lng });
  });

  test('元の座標は保存も返却もしない（ずらした位置で地理院APIを呼ぶ）', async () => {
    const { handler, pinStore, geocodeCalls } = setup({ users: [KOMATSU] });
    const res = await call(handler, post(ORIGINAL));
    const saved = pinStore[0];
    expect(saved.lat).not.toBe(ORIGINAL.lat);
    expect(saved.lng).not.toBe(ORIGINAL.lng);
    expect(JSON.stringify(saved)).not.toContain(String(ORIGINAL.lat));
    expect(JSON.stringify(res.body)).not.toContain(String(ORIGINAL.lng));
    expect(geocodeCalls).toEqual([{ lat: saved.lat, lng: saved.lng }]);
  });

  test('ランキング（人・市町村・血液型）と pinCount を1ずつ増やす', async () => {
    const { handler, rankings, store } = setup({ users: [KOMATSU] });
    await call(handler, post(ORIGINAL));
    await call(handler, post(ORIGINAL));
    expect(Object.fromEntries(rankings)).toEqual({
      [`2026-11#user|${SUB}`]: { label: 'こまつ', count: 2 },
      '2026-11#city|13101': { label: '東京都千代田区', count: 2 },
      '2026-11#blood|A': { label: 'A型', count: 2 },
    });
    expect(store.get(SUB)?.pinCount).toBe(4);
  });

  test('市町村が不明なら city "不明"・cityCode null で成功し、市町村ランキングは数えない', async () => {
    const { handler, rankings, pinStore } = setup({ users: [KOMATSU], city: { city: '不明', cityCode: null } });
    const res = await call(handler, post(ORIGINAL));
    expect(res.status).toBe(201);
    expect(res.body.city).toBe('不明');
    expect(pinStore[0].cityCode).toBeNull();
    expect([...rankings.keys()].some((k) => k.includes('#city'))).toBe(false);
    expect(rankings.size).toBe(2);
  });

  test('月は日本時間で区切る（UTCでは10/31でも日本時間で11/1なら 2026-11）', async () => {
    const { handler, rankings } = setup({ users: [KOMATSU], overrides: { now: () => new Date('2026-10-31T15:30:00Z') } });
    const res = await call(handler, post(ORIGINAL));
    expect(res.body.createdAt).toBe('2026-11-01T00:30:00+09:00');
    expect([...rankings.keys()].every((k) => k.startsWith('2026-11#'))).toBe(true);
  });

  test('スタンプとメモは省略できる（stamp は null、memo は空）', async () => {
    const { handler } = setup({ users: [KOMATSU] });
    const res = await call(handler, post(ORIGINAL));
    expect(res.body).toMatchObject({ stamp: null, memo: '' });
  });

  test('メモは100文字まで（絵文字も1文字）、改行は使える', async () => {
    const { handler } = setup({ users: [KOMATSU] });
    expect((await call(handler, post({ ...ORIGINAL, memo: '🦟'.repeat(100) }))).status).toBe(201);
    const res = await call(handler, post({ ...ORIGINAL, memo: '公園\r\nベンチ' }));
    expect(res.body.memo).toBe('公園\nベンチ');
  });

  test('本文の userId は無視し、トークンの sub を使う', async () => {
    const { handler, pinStore } = setup({ users: [KOMATSU] });
    await call(handler, post({ ...ORIGINAL, userId: 'hacker' }));
    expect(pinStore[0].userId).toBe(SUB);
  });

  test('ログインしていなければ 401（入力チェックより先）', async () => {
    const { handler, pinStore } = setup({ users: [KOMATSU] });
    expect((await call(handler, post({ lat: 'x' }, ''))).status).toBe(401);
    expect((await call(handler, post(ORIGINAL, 'bad'))).status).toBe(401);
    expect(pinStore).toHaveLength(0);
  });

  test('プロフィール未登録なら 403 PROFILE_REQUIRED', async () => {
    const { handler, pinStore, rankings } = setup();
    const res = await call(handler, post(ORIGINAL));
    expect(res).toMatchObject({ status: 403, body: { error: 'PROFILE_REQUIRED' } });
    expect(pinStore).toHaveLength(0);
    expect(rankings.size).toBe(0);
  });

  test.each([
    ['緯度なし', { lng: 139.7 }],
    ['経度なし', { lat: 35.6 }],
    ['緯度が文字列', { lat: '35.6', lng: 139.7 }],
    ['緯度が20より小さい', { lat: 19.99, lng: 139.7 }],
    ['緯度が46より大きい', { lat: 46.01, lng: 139.7 }],
    ['経度が122より小さい', { lat: 35.6, lng: 121.99 }],
    ['経度が154より大きい', { lat: 35.6, lng: 154.01 }],
    ['スタンプが一覧にない', { ...ORIGINAL, stamp: 'odaiji' }],
    ['スタンプが文字列でない', { ...ORIGINAL, stamp: 1 }],
    ['メモが101文字', { ...ORIGINAL, memo: 'あ'.repeat(101) }],
    ['メモが文字列でない', { ...ORIGINAL, memo: 123 }],
    ['メモにタブ', { ...ORIGINAL, memo: 'a\tb' }],
    ['本文が配列', [35.6, 139.7]],
    ['本文がJSONでない', '{lat:'],
  ])('%s は 400 VALIDATION_ERROR', async (_name, body) => {
    const { handler, pinStore } = setup({ users: [KOMATSU] });
    const res = await call(handler, post(body));
    expect(res).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
    expect(pinStore).toHaveLength(0);
  });

  test('境界の値（20・46・122・154）は受け付ける', async () => {
    const { handler } = setup({ users: [KOMATSU] });
    expect((await call(handler, post({ lat: 20, lng: 122 }))).status).toBe(201);
    expect((await call(handler, post({ lat: 46, lng: 154 }))).status).toBe(201);
  });

  test('件数の更新に失敗しても、ピンは保存済みなので 201（ログには座標を出さない）', async () => {
    const errors: string[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a.join(' ')));
    const { handler, pinStore } = setup({
      users: [KOMATSU],
      overrides: {
        rankings: {
          increment: async () => {
            throw new Error('ProvisionedThroughputExceededException');
          },
        },
      },
    });
    const res = await call(handler, post(ORIGINAL));
    expect(res.status).toBe(201);
    expect(pinStore).toHaveLength(1);
    expect(errors.join('\n')).not.toMatch(/35\.\d|139\.\d/);
    spy.mockRestore();
  });
});

// ---- GET ----

function pin(n: number, lat: number, lng: number, extra: Partial<PinItem> = {}): PinItem {
  const createdAt = `2026-11-17T10:${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}+09:00`;
  const pinId = `PIN${String(n).padStart(5, '0')}`;
  return {
    cell: encodeGeohash(lat, lng),
    sk: `${createdAt}#${pinId}`,
    pinId,
    lat,
    lng,
    city: '東京都千代田区',
    cityCode: '13101',
    stamp: 'kayui',
    memo: `メモ${n}`,
    userId: 'secret-user',
    commentCount: 1,
    reactions: { odaiji: 2 },
    createdAt,
    ...extra,
  };
}

const RANGE = { minLat: '35.60', maxLat: '35.75', minLng: '139.65', maxLng: '139.85' };
const get = (query?: Record<string, string>) => event('GET', '/api/pins', { query });

describe('GET /api/pins', () => {
  test('ログインなしで範囲内のピンを新しい順に返す。範囲外・userId・cityCode は返さない', async () => {
    const { handler } = setup({
      pins: [pin(1, 35.68, 139.76), pin(3, 35.70, 139.70), pin(2, 35.61, 139.84), pin(4, 35.80, 139.76)],
    });
    const res = await call(handler, get(RANGE));
    expect(res.status).toBe(200);
    expect(res.body.truncated).toBe(false);
    const id = (n: number, lat: number, lng: number) => `${encodeGeohash(lat, lng)}-PIN0000${n}`;
    expect(res.body.pins.map((p: { pinId: string }) => p.pinId)).toEqual([
      id(3, 35.7, 139.7),
      id(2, 35.61, 139.84),
      id(1, 35.68, 139.76),
    ]);
    expect(res.body.pins[0]).toEqual({
      pinId: id(3, 35.7, 139.7),
      lat: 35.7,
      lng: 139.7,
      city: '東京都千代田区',
      stamp: 'kayui',
      memo: 'メモ3',
      createdAt: '2026-11-17T10:00:03+09:00',
      commentCount: 1,
      reactions: { odaiji: 2 },
    });
    expect(JSON.stringify(res.body)).not.toContain('secret-user');
    expect(JSON.stringify(res.body)).not.toContain('13101');
  });

  test('200件より多ければ新しい200件と truncated: true', async () => {
    const pins = Array.from({ length: 205 }, (_, i) => pin(i, 35.68 + i * 1e-5, 139.76));
    const { handler } = setup({ pins });
    const res = await call(handler, get(RANGE));
    expect(res.body.pins).toHaveLength(200);
    expect(res.body.truncated).toBe(true);
    expect(res.body.pins[0].pinId).toMatch(/-PIN00204$/);
  });

  test('0.5度ちょうどの範囲はOK（小数の誤差で弾かない）。Query は12回以内', async () => {
    const { handler, queriedCells } = setup();
    const res = await call(handler, get({ minLat: '35.6', maxLat: '36.1', minLng: '139.6', maxLng: '140.1' }));
    expect(res.status).toBe(200);
    expect(queriedCells.length).toBeLessThanOrEqual(12);
  });

  test.each([
    ['パラメータなし', undefined],
    ['maxLng がない', { minLat: '35.6', maxLat: '35.7', minLng: '139.6' }],
    ['数でない', { ...RANGE, minLat: 'abc' }],
    ['空文字', { ...RANGE, minLat: '' }],
    ['Infinity', { ...RANGE, maxLat: 'Infinity' }],
    ['指数の形', { ...RANGE, minLat: '3.5e1' }],
    ['min が max より大きい', { ...RANGE, minLat: '35.8' }],
    ['縦が0.5度より広い', { ...RANGE, minLat: '35.0', maxLat: '35.51' }],
    ['横が0.5度より広い', { ...RANGE, minLng: '139.0', maxLng: '139.51' }],
    ['緯度が90より大きい', { minLat: '89.9', maxLat: '90.1', minLng: '0', maxLng: '0.1' }],
  ])('%s は 400 VALIDATION_ERROR', async (_name, query) => {
    const { handler } = setup();
    const res = await call(handler, get(query));
    expect(res).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
  });
});
