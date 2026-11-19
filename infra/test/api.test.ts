import { call, event, GOOD_TOKEN, setup as baseSetup, SUB } from './fakes';
import type { UserItem } from '../lambda/api/users';

// Lambda の振り分け・ログイン確認・/api/me のテスト。
// 本物の Cognito と DynamoDB の代わりに、偽物（メモリ上。test/fakes.ts）を使う。

const setup = (users: UserItem[] = []) => baseSetup({ users });

describe('振り分け', () => {
  test('GET /api/hello は今までどおり hello を返す', async () => {
    const { handler } = setup();
    expect(await call(handler, event('GET', '/api/hello'))).toEqual({ status: 200, body: { message: 'hello' } });
  });

  test('ないAPIは 404 NOT_FOUND', async () => {
    const { handler } = setup();
    const res = await call(handler, event('GET', '/api/nothing'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

describe('ログインの確認', () => {
  test('X-Id-Token がなければ 401', async () => {
    const { handler } = setup();
    const res = await call(handler, event('GET', '/api/me'));
    expect(res).toMatchObject({ status: 401, body: { error: 'UNAUTHORIZED' } });
  });

  test('正しくないトークンは 401', async () => {
    const { handler } = setup();
    const res = await call(handler, event('GET', '/api/me', { token: 'bad' }));
    expect(res).toMatchObject({ status: 401, body: { error: 'UNAUTHORIZED' } });
  });
});

describe('GET /api/me', () => {
  test('未登録なら 404 NOT_FOUND', async () => {
    const { handler } = setup();
    const res = await call(handler, event('GET', '/api/me', { token: GOOD_TOKEN }));
    expect(res).toMatchObject({ status: 404, body: { error: 'NOT_FOUND' } });
  });

  test('登録済みならプロフィールを返す（pinCount がなければ 0。ピンがなければ monthCount・odaijiReceived も 0）', async () => {
    const { handler } = setup([
      { userId: SUB, nickname: 'こまつ', bloodType: 'A', createdAt: 'x', updatedAt: 'x' },
    ]);
    const res = await call(handler, event('GET', '/api/me', { token: GOOD_TOKEN }));
    expect(res).toEqual({
      status: 200,
      body: { userId: SUB, nickname: 'こまつ', bloodType: 'A', pinCount: 0, monthCount: 0, odaijiReceived: 0 },
    });
  });
});

describe('PUT /api/me', () => {
  test('登録できて、userId はトークンの sub になる（本文の userId は無視）', async () => {
    const { handler, store } = setup();
    const res = await call(
      handler,
      event('PUT', '/api/me', { token: GOOD_TOKEN, body: { nickname: ' こまつ ', bloodType: 'AB', userId: 'hacker' } }),
    );
    expect(res).toEqual({ status: 200, body: { userId: SUB, nickname: 'こまつ', bloodType: 'AB', pinCount: 0 } });
    expect(store.has('hacker')).toBe(false);
    expect(store.get(SUB)?.pinCount).toBe(0); // 登録のときに pinCount を 0 で持たせる
    expect(store.get(SUB)?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/);
  });

  test('変更しても createdAt と pinCount は残る', async () => {
    const { handler, store } = setup([
      { userId: SUB, nickname: 'old', bloodType: 'A', createdAt: 'first', updatedAt: 'first', pinCount: 3 },
    ]);
    const res = await call(handler, event('PUT', '/api/me', { token: GOOD_TOKEN, body: { nickname: 'new', bloodType: 'O' } }));
    expect(res.body).toEqual({ userId: SUB, nickname: 'new', bloodType: 'O', pinCount: 3 });
    expect(store.get(SUB)?.createdAt).toBe('first');
  });

  test('ニックネームは20文字までOK（絵文字も1文字と数える）', async () => {
    const { handler } = setup();
    const nickname = '🦟'.repeat(20);
    const res = await call(handler, event('PUT', '/api/me', { token: GOOD_TOKEN, body: { nickname, bloodType: 'UNKNOWN' } }));
    expect(res.status).toBe(200);
  });

  test.each([
    ['ニックネームなし', { bloodType: 'A' }],
    ['ニックネームが空白だけ', { nickname: '   ', bloodType: 'A' }],
    ['ニックネームが21文字', { nickname: 'あ'.repeat(21), bloodType: 'A' }],
    ['ニックネームが文字列でない', { nickname: 123, bloodType: 'A' }],
    ['ニックネームに改行', { nickname: 'こま\nつ', bloodType: 'A' }],
    ['血液型なし', { nickname: 'こまつ' }],
    ['血液型が一覧にない', { nickname: 'こまつ', bloodType: 'C' }],
    ['血液型が小文字', { nickname: 'こまつ', bloodType: 'a' }],
    ['本文が配列', ['こまつ', 'A']],
    ['本文がJSONでない', '{nickname:'],
  ])('%s は 400 VALIDATION_ERROR', async (_name, body) => {
    const { handler, store } = setup();
    const res = await call(handler, event('PUT', '/api/me', { token: GOOD_TOKEN, body }));
    expect(res).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
    expect(typeof res.body.message).toBe('string');
    expect(store.size).toBe(0);
  });

  test('ログインしていなければ、入力チェックより先に 401', async () => {
    const { handler } = setup();
    const res = await call(handler, event('PUT', '/api/me', { body: { nickname: 'x', bloodType: 'A' } }));
    expect(res.status).toBe(401);
  });
});

test('DBのエラーなど想定外のときは 500 INTERNAL_ERROR', async () => {
  const fail = async () => {
    throw new Error('db down');
  };
  const { handler } = baseSetup({
    overrides: { users: { get: fail, saveProfile: fail, incrementPinCount: fail, decrementPinCount: fail } },
  });
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await call(handler, event('GET', '/api/me', { token: GOOD_TOKEN }));
  expect(res).toMatchObject({ status: 500, body: { error: 'INTERNAL_ERROR' } });
  spy.mockRestore();
});
