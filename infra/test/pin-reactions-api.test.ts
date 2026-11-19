import { call, event, setup } from './fakes';
import { toPublicPinId } from '../lambda/api/pin-id';
import { getReactions } from '../lambda/api/reaction-api';
import type { PinsRepo } from '../lambda/api/pins';
import type { ReactionsRepo } from '../lambda/api/reactions';
import { ulid } from '../lambda/api/ulid';
import type { UserItem } from '../lambda/api/users';

// GET /api/pins/{pinId}/reactions のテスト（偽物の DB を使う）。
// トークンの文字列をそのまま userId（sub）にする。'bad' だけは正しくないトークンとして扱う。

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

async function withPin() {
  const s = setup({
    users: [ALICE, BOB],
    overrides: {
      verifyIdToken: async (token) => {
        if (token === 'bad') throw new Error('invalid');
        return { sub: token };
      },
    },
  });
  const res = await call(s.handler, event('POST', '/api/pins', { token: 'alice', body: { lat: 35.68, lng: 139.76 } }));
  return { ...s, pinId: res.body.pinId as string };
}

const get = (pinId: string, token?: string) => event('GET', `/api/pins/${pinId}/reactions`, { token });
const put = (pinId: string, type: string, token: string) => event('PUT', `/api/pins/${pinId}/reactions/${type}`, { token });
const del = (pinId: string, type: string, token: string) => event('DELETE', `/api/pins/${pinId}/reactions/${type}`, { token });

const MISSING = toPublicPinId('xn76', ulid(Date.parse('2026-11-17T03:00:00Z')));

describe('GET /api/pins/{pinId}/reactions', () => {
  test('スタンプがまだなければ、空の件数と []', async () => {
    const { handler, pinId } = await withPin();
    expect(await call(handler, get(pinId))).toEqual({ status: 200, body: { reactions: {}, myReactions: [] } });
  });

  test('ログインしていなければ、件数だけを返し myReactions は []', async () => {
    const { handler, pinId } = await withPin();
    await call(handler, put(pinId, 'odaiji', 'alice'));
    await call(handler, put(pinId, 'odaiji', 'bob'));
    await call(handler, put(pinId, 'kaite', 'bob'));
    expect(await call(handler, get(pinId))).toEqual({
      status: 200,
      body: { reactions: { odaiji: 2, kaite: 1 }, myReactions: [] },
    });
  });

  test('ログインしていれば、自分が押したものだけを odaiji・kaite・wakaru の順で返す', async () => {
    const { handler, pinId } = await withPin();
    await call(handler, put(pinId, 'wakaru', 'bob'));
    await call(handler, put(pinId, 'odaiji', 'bob'));
    await call(handler, put(pinId, 'kaite', 'alice'));
    expect(await call(handler, get(pinId, 'bob'))).toEqual({
      status: 200,
      body: { reactions: { odaiji: 1, kaite: 1, wakaru: 1 }, myReactions: ['odaiji', 'wakaru'] },
    });
    expect((await call(handler, get(pinId, 'alice'))).body.myReactions).toEqual(['kaite']);
  });

  test('取り消して0件になった種類は返さない', async () => {
    const { handler, pinId } = await withPin();
    await call(handler, put(pinId, 'odaiji', 'bob'));
    await call(handler, put(pinId, 'kaite', 'bob'));
    await call(handler, del(pinId, 'odaiji', 'bob'));
    expect(await call(handler, get(pinId, 'bob'))).toEqual({
      status: 200,
      body: { reactions: { kaite: 1 }, myReactions: ['kaite'] },
    });
  });

  test('PUT が返す形と同じ', async () => {
    const { handler, pinId } = await withPin();
    const putRes = await call(handler, put(pinId, 'odaiji', 'bob'));
    expect(await call(handler, get(pinId, 'bob'))).toEqual(putRes);
  });

  test('プロフィール未登録の人でも 200 で []（押せないので）', async () => {
    const { handler, pinId } = await withPin();
    await call(handler, put(pinId, 'odaiji', 'bob'));
    expect(await call(handler, get(pinId, 'nobody'))).toEqual({
      status: 200,
      body: { reactions: { odaiji: 1 }, myReactions: [] },
    });
  });

  test('トークンが正しくない・期限切れなら 401（[] にしない）', async () => {
    const { handler, pinId } = await withPin();
    const res = await call(handler, get(pinId, 'bad'));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  test('ピンがなければ 404。pinId の形がおかしくても 404', async () => {
    const { handler } = await withPin();
    for (const id of [MISSING, 'xn76-xxx', 'abc']) {
      const res = await call(handler, get(id, 'bob'));
      expect(res).toEqual({ status: 404, body: { error: 'NOT_FOUND', message: 'ピンが見つかりません' } });
    }
    expect((await call(handler, get(MISSING))).status).toBe(404);
  });

  test('消したピンは 404（スタンプの行が残っていても）', async () => {
    const { handler, pinId, reactionStore } = await withPin();
    await call(handler, put(pinId, 'odaiji', 'bob'));
    const before = new Map(reactionStore);
    await call(handler, event('DELETE', `/api/pins/${pinId}`, { token: 'alice' }));
    for (const [k, v] of before) reactionStore.set(k, v); // 消しきれずに残った場合を作る
    expect((await call(handler, get(pinId, 'bob'))).status).toBe(404);
  });

  test('末尾の / があっても同じ', async () => {
    const { handler, pinId } = await withPin();
    expect((await call(handler, event('GET', `/api/pins/${pinId}/reactions/`))).status).toBe(200);
  });
});

describe('getReactions の読み込み', () => {
  const key = MISSING;
  const pins = { getReactions: async () => ({ odaiji: 2, kaite: 0 }) } as unknown as PinsRepo;

  test('ログインしていなければ Reactions は読まない', async () => {
    const reactions = {
      has: async () => {
        throw new Error('読まないはず');
      },
    } as unknown as ReactionsRepo;
    expect(await getReactions(undefined, key, { pins, reactions })).toEqual({ reactions: { odaiji: 2 }, myReactions: [] });
  });

  test('ログインしていれば、Reactions を GetItem（has）で種類の数だけ読む', async () => {
    const asked: string[] = [];
    const reactions = {
      has: async (_pinId: string, type: string, userId: string) => {
        asked.push(`${type}#${userId}`);
        return type === 'odaiji';
      },
    } as unknown as ReactionsRepo;
    expect(await getReactions('bob', key, { pins, reactions })).toEqual({
      reactions: { odaiji: 2 },
      myReactions: ['odaiji'],
    });
    expect(asked.sort()).toEqual(['kaite#bob', 'odaiji#bob', 'wakaru#bob']);
  });
});
