import { call, event, setup } from './fakes';
import { toPublicPinId } from '../lambda/api/pin-id';
import { ulid } from '../lambda/api/ulid';
import type { UserItem } from '../lambda/api/users';

// PUT/DELETE /api/pins/{pinId}/reactions/{type} のテスト（偽物の DB を使う）。
// トークンの文字列をそのまま userId（sub）にして、2人で押す場面を作る。

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

async function withPin(users: UserItem[] = [ALICE, BOB]) {
  const s = setup({ users, overrides: { verifyIdToken: async (token) => ({ sub: token }) } });
  const res = await call(s.handler, event('POST', '/api/pins', { token: 'alice', body: { lat: 35.68, lng: 139.76 } }));
  return { ...s, pinId: res.body.pinId as string };
}

const put = (pinId: string, type: string, token = 'bob') => event('PUT', `/api/pins/${pinId}/reactions/${type}`, { token });
const del = (pinId: string, type: string, token = 'bob') => event('DELETE', `/api/pins/${pinId}/reactions/${type}`, { token });

const MISSING = toPublicPinId('xn76', ulid(Date.parse('2026-11-17T03:00:00Z')));

describe('PUT /api/pins/{pinId}/reactions/{type}', () => {
  test('押すと 200。件数と自分が押したものを返し、Pins の件数も増える', async () => {
    const { handler, pinId, pinStore, reactionStore } = await withPin();
    const res = await call(handler, put(pinId, 'odaiji'));
    expect(res).toEqual({ status: 200, body: { reactions: { odaiji: 1 }, myReactions: ['odaiji'] } });
    expect(pinStore[0].reactions).toEqual({ odaiji: 1 });
    expect([...reactionStore.values()]).toEqual([
      {
        pinId: pinStore[0].pinId,
        sk: 'odaiji#bob',
        type: 'odaiji',
        userId: 'bob',
        nickname: 'ぼぶ',
        createdAt: '2026-11-17T12:00:00+09:00',
      },
    ]);
  });

  test('同じ人が二重に押しても件数は増えない', async () => {
    const { handler, pinId, pinStore } = await withPin();
    await call(handler, put(pinId, 'odaiji'));
    const res = await call(handler, put(pinId, 'odaiji'));
    expect(res).toEqual({ status: 200, body: { reactions: { odaiji: 1 }, myReactions: ['odaiji'] } });
    expect(pinStore[0].reactions).toEqual({ odaiji: 1 });
  });

  test('別の人・別の種類は数える。myReactions は自分の分だけ（並びは odaiji・kaite・wakaru）', async () => {
    const { handler, pinId } = await withPin();
    await call(handler, put(pinId, 'odaiji', 'alice'));
    await call(handler, put(pinId, 'wakaru'));
    const res = await call(handler, put(pinId, 'odaiji'));
    expect(res.body).toEqual({ reactions: { odaiji: 2, wakaru: 1 }, myReactions: ['odaiji', 'wakaru'] });
  });

  test('地図（GET /api/pins）にも件数が出る', async () => {
    const { handler, pinId } = await withPin();
    await call(handler, put(pinId, 'kaite'));
    const res = await call(
      handler,
      event('GET', '/api/pins', { query: { minLat: '35.6', maxLat: '35.8', minLng: '139.7', maxLng: '139.8' } }),
    );
    expect(res.body.pins[0]).toMatchObject({ pinId, reactions: { kaite: 1 } });
  });

  test.each(['kayui', 'itai', 'ODAIJI', 'x'])('種類 %s は 400 VALIDATION_ERROR', async (type) => {
    const { handler, pinId, pinStore } = await withPin();
    const res = await call(handler, put(pinId, type));
    expect(res).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
    expect(pinStore[0].reactions).toEqual({});
  });

  test('ログインしていなければ 401', async () => {
    const { handler, pinId } = await withPin();
    expect((await call(handler, event('PUT', `/api/pins/${pinId}/reactions/odaiji`))).status).toBe(401);
  });

  test('プロフィール未登録なら 403 PROFILE_REQUIRED', async () => {
    const { handler, pinId, pinStore } = await withPin();
    const res = await call(handler, put(pinId, 'odaiji', 'carol'));
    expect(res).toMatchObject({ status: 403, body: { error: 'PROFILE_REQUIRED' } });
    expect(pinStore[0].reactions).toEqual({});
  });

  test('ピンがない・pinId の形が違うときは 404', async () => {
    const { handler, reactionStore } = await withPin();
    expect((await call(handler, put(MISSING, 'odaiji'))).status).toBe(404);
    expect((await call(handler, put('nope', 'odaiji'))).status).toBe(404);
    expect(reactionStore.size).toBe(0);
  });
});

describe('DELETE /api/pins/{pinId}/reactions/{type}', () => {
  test('取り消すと件数が減り、0件の種類は返さない', async () => {
    const { handler, pinId, pinStore, reactionStore } = await withPin();
    await call(handler, put(pinId, 'odaiji'));
    await call(handler, put(pinId, 'kaite'));
    const res = await call(handler, del(pinId, 'odaiji'));
    expect(res).toEqual({ status: 200, body: { reactions: { kaite: 1 }, myReactions: ['kaite'] } });
    expect(pinStore[0].reactions).toEqual({ odaiji: 0, kaite: 1 });
    expect(reactionStore.size).toBe(1);
  });

  test('押していないものを取り消しても件数は減らない', async () => {
    const { handler, pinId, pinStore } = await withPin();
    await call(handler, put(pinId, 'odaiji', 'alice'));
    const res = await call(handler, del(pinId, 'odaiji'));
    expect(res).toEqual({ status: 200, body: { reactions: { odaiji: 1 }, myReactions: [] } });
    expect(pinStore[0].reactions).toEqual({ odaiji: 1 });
  });

  test('ピンがなければ 404、種類が違えば 400、未登録なら 403、ログインなしは 401', async () => {
    const { handler, pinId } = await withPin();
    expect((await call(handler, del(MISSING, 'odaiji'))).status).toBe(404);
    expect((await call(handler, del(pinId, 'kayui'))).status).toBe(400);
    expect((await call(handler, del(pinId, 'odaiji', 'carol'))).status).toBe(403);
    expect((await call(handler, event('DELETE', `/api/pins/${pinId}/reactions/odaiji`))).status).toBe(401);
  });
});
