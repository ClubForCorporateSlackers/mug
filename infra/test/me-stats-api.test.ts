import { call, event, setup } from './fakes';
import { loadMeStats } from '../lambda/api/me';
import type { PinItem, PinsRepo, RankingsRepo } from '../lambda/api/pins';
import type { UserItem } from '../lambda/api/users';

// GET /api/me の monthCount・odaijiReceived のテスト（偽物の DB を使う。docs/decisions.md #38）。
// トークンの文字列をそのまま userId（sub）にする。今は 2026-11-17 12:00（日本時間。fakes.ts の now）。

const user = (userId: string, nickname: string): UserItem => ({
  userId,
  nickname,
  bloodType: 'O',
  createdAt: 'x',
  updatedAt: 'x',
  pinCount: 0,
});
const ALICE = user('alice', 'ありす');
const BOB = user('bob', 'ぼぶ');

// 先月（2026-10）に alice が立てたピン。お大事に 2・かいて 1
const OLD_PIN: PinItem = {
  cell: 'xn76',
  sk: '2026-10-20T10:00:00+09:00#01JAOLD0000000000000000000',
  pinId: '01JAOLD0000000000000000000',
  lat: 35.68,
  lng: 139.76,
  city: '東京都千代田区',
  cityCode: '13101',
  stamp: null,
  memo: '',
  userId: 'alice',
  commentCount: 0,
  reactions: { odaiji: 2, kaite: 1 },
  createdAt: '2026-10-20T10:00:00+09:00',
};

function start(pins: PinItem[] = []) {
  return setup({ users: [ALICE, BOB], pins, overrides: { verifyIdToken: async (token) => ({ sub: token }) } });
}

const me = (token: string) => event('GET', '/api/me', { token });
const post = (token: string) => event('POST', '/api/pins', { token, body: { lat: 35.68, lng: 139.76 } });
const react = (method: 'PUT' | 'DELETE', pinId: string, type: string, token: string) =>
  event(method, `/api/pins/${pinId}/reactions/${type}`, { token });

const stats = async (handler: ReturnType<typeof setup>['handler'], token: string) => {
  const { body } = await call(handler, me(token));
  return { monthCount: body.monthCount, odaijiReceived: body.odaijiReceived };
};

describe('GET /api/me の monthCount・odaijiReceived', () => {
  test('ピンを立てると monthCount が増え、ほかの人の「お大事に」が odaijiReceived に入る', async () => {
    const { handler } = start();
    const p1 = (await call(handler, post('alice'))).body.pinId;
    const p2 = (await call(handler, post('alice'))).body.pinId;
    await call(handler, react('PUT', p1, 'odaiji', 'bob'));
    await call(handler, react('PUT', p2, 'odaiji', 'bob'));

    const res = await call(handler, me('alice'));
    expect(res).toEqual({
      status: 200,
      body: { userId: 'alice', nickname: 'ありす', bloodType: 'O', pinCount: 2, monthCount: 2, odaijiReceived: 2 },
    });
    // 押した側（bob）の数は増えない
    expect(await stats(handler, 'bob')).toEqual({ monthCount: 0, odaijiReceived: 0 });
  });

  test('かいて・わかるは数えない。自分で押した「お大事に」は数える', async () => {
    const { handler } = start();
    const p = (await call(handler, post('alice'))).body.pinId;
    await call(handler, react('PUT', p, 'kaite', 'bob'));
    await call(handler, react('PUT', p, 'wakaru', 'bob'));
    expect(await stats(handler, 'alice')).toEqual({ monthCount: 1, odaijiReceived: 0 });
    await call(handler, react('PUT', p, 'odaiji', 'alice'));
    expect(await stats(handler, 'alice')).toEqual({ monthCount: 1, odaijiReceived: 1 });
  });

  test('取り消すと odaijiReceived が減る', async () => {
    const { handler } = start();
    const p = (await call(handler, post('alice'))).body.pinId;
    await call(handler, react('PUT', p, 'odaiji', 'bob'));
    await call(handler, react('DELETE', p, 'odaiji', 'bob'));
    expect(await stats(handler, 'alice')).toEqual({ monthCount: 1, odaijiReceived: 0 });
  });

  test('先月のピンは monthCount に入らないが、その「お大事に」は odaijiReceived に入る（既にあるデータもそのまま数える）', async () => {
    const s = start([OLD_PIN]);
    s.rankings.set('2026-10#user|alice', { label: 'ありす', count: 1 }); // 先月の「人」の行
    await call(s.handler, post('alice'));
    expect(await stats(s.handler, 'alice')).toEqual({ monthCount: 1, odaijiReceived: 2 });
  });

  test('ピンを消すと、そのピンの分は両方から減る', async () => {
    const { handler } = start([OLD_PIN]);
    const p = (await call(handler, post('alice'))).body.pinId;
    await call(handler, react('PUT', p, 'odaiji', 'bob'));
    expect(await stats(handler, 'alice')).toEqual({ monthCount: 1, odaijiReceived: 3 });
    await call(handler, event('DELETE', `/api/pins/${p}`, { token: 'alice' }));
    expect(await stats(handler, 'alice')).toEqual({ monthCount: 0, odaijiReceived: 2 });
  });

  test('PUT /api/me の返すものは変わらない（2つの項目は付けない）', async () => {
    const { handler } = start();
    await call(handler, post('alice'));
    const res = await call(handler, event('PUT', '/api/me', { token: 'alice', body: { nickname: 'ありす2', bloodType: 'A' } }));
    expect(res).toEqual({ status: 200, body: { userId: 'alice', nickname: 'ありす2', bloodType: 'A', pinCount: 1 } });
  });
});

describe('GET /api/me の今までの動きと、数を読めないとき', () => {
  const failingRankings: RankingsRepo = {
    increment: async () => {},
    list: async () => [],
    decrement: async () => {},
    getCount: async () => {
      const e = new Error('Throughput exceeds the current capacity');
      e.name = 'ProvisionedThroughputExceededException';
      throw e;
    },
  };

  test('未登録なら今までどおり 404 で、数は読まない', async () => {
    const getCount = jest.fn(async () => 0);
    const { handler } = setup({
      overrides: {
        verifyIdToken: async (token) => ({ sub: token }),
        rankings: { ...failingRankings, getCount },
      },
    });
    const res = await call(handler, me('nobody'));
    expect(res).toMatchObject({ status: 404, body: { error: 'NOT_FOUND' } });
    expect(getCount).not.toHaveBeenCalled();
  });

  test('トークンがなければ今までどおり 401', async () => {
    const { handler } = start();
    expect((await call(handler, event('GET', '/api/me'))).status).toBe(401);
  });

  test('数の読み込みに失敗したら、2つの項目を付けずに 200（ログには種類だけ残す）', async () => {
    const { handler } = setup({
      users: [ALICE],
      overrides: { verifyIdToken: async (token) => ({ sub: token }), rankings: failingRankings },
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call(handler, me('alice'));
    expect(res).toEqual({ status: 200, body: { userId: 'alice', nickname: 'ありす', bloodType: 'O', pinCount: 0 } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0].join(' '))).toContain('ProvisionedThroughputExceededException');
    expect(String(spy.mock.calls[0].join(' '))).not.toContain('alice');
    spy.mockRestore();
  });
});

describe('loadMeStats', () => {
  const rankings = { getCount: jest.fn(async () => 3) } as unknown as RankingsRepo;

  test('今月は日本時間で決める（UTC では 10月でも、日本時間で 11月なら 2026-11）', async () => {
    const pins = { sumReactionsByUser: async () => 5 } as unknown as PinsRepo;
    const now = () => new Date('2026-10-31T15:30:00Z'); // 日本時間 11/1 0:30
    expect(await loadMeStats('alice', { pins, rankings, now })).toEqual({ monthCount: 3, odaijiReceived: 5 });
    expect(rankings.getCount).toHaveBeenCalledWith('2026-11', 'user', 'alice');
  });

  test('索引の読み込みに失敗しても undefined（例外にしない）', async () => {
    const pins = {
      sumReactionsByUser: async () => {
        throw new Error('index down');
      },
    } as unknown as PinsRepo;
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadMeStats('alice', { pins, rankings })).toBeUndefined();
    spy.mockRestore();
  });
});
