import { call, event, GOOD_TOKEN, setup, SUB } from './fakes';
import { parsePublicPinId, toPublicPinId } from '../lambda/api/pin-id';
import { ulid } from '../lambda/api/ulid';
import type { UserItem } from '../lambda/api/users';

// GET/POST /api/pins/{pinId}/comments のテスト（偽物の DB を使う）。

const KOMATSU: UserItem = { userId: SUB, nickname: 'こまつ', bloodType: 'A', createdAt: 'x', updatedAt: 'x', pinCount: 0 };

// ピンを1本立てて、その pinId を返す
async function withPin(users: UserItem[] = [KOMATSU]) {
  const s = setup({ users });
  const res = await call(s.handler, event('POST', '/api/pins', { token: GOOD_TOKEN, body: { lat: 35.68, lng: 139.76 } }));
  return { ...s, pinId: res.body.pinId as string };
}

const postComment = (pinId: string, body: unknown, token: string | undefined = GOOD_TOKEN) =>
  event('POST', `/api/pins/${pinId}/comments`, { token, body });
const getComments = (pinId: string) => event('GET', `/api/pins/${pinId}/comments`);

// 形は正しいが、どこにもないピン
const MISSING = toPublicPinId('xn76', ulid(Date.parse('2026-11-17T03:00:00Z')));

describe('pinId（cell-ULID）', () => {
  test('ULID の時刻から Pins の sk（日時#ULID）を作り直せる', () => {
    const id = ulid(Date.parse('2026-11-17T03:00:00.789Z'));
    expect(parsePublicPinId(`xn76-${id}`)).toEqual({ cell: 'xn76', sk: `2026-11-17T12:00:00+09:00#${id}`, pinId: id });
  });

  test.each(['', 'xn76', '01JD0000000000000000000000', 'xn76-abc', 'XN76-01JD0000000000000000000000', 'xn76_01JD0000000000000000000000', 'xn76-81JD0000000000000000000000'])(
    '形が違う pinId（%s）は undefined',
    (id) => {
      expect(parsePublicPinId(id)).toBeUndefined();
    },
  );

  test('POST /api/pins の pinId から、保存したピンのキーが分かる', async () => {
    const { pinId, pinStore } = await withPin();
    expect(parsePublicPinId(pinId)).toEqual({ cell: pinStore[0].cell, sk: pinStore[0].sk, pinId: pinStore[0].pinId });
  });
});

describe('POST /api/pins/{pinId}/comments', () => {
  test('コメントすると 201。ニックネーム付きで返し、Pins の commentCount を1増やす', async () => {
    const { handler, pinId, pinStore, commentStore } = await withPin();
    const res = await call(handler, postComment(pinId, { text: ' お大事に！ ' }));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      commentId: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
      nickname: 'こまつ',
      text: 'お大事に！',
      createdAt: '2026-11-17T12:00:00+09:00',
    });
    expect(JSON.stringify(res.body)).not.toContain(SUB);
    expect(pinStore[0].commentCount).toBe(1);
    // Comments のキーは ULID（cell を除いた pinId）
    expect(commentStore[0]).toMatchObject({
      pinId: pinStore[0].pinId,
      sk: `2026-11-17T12:00:00+09:00#${res.body.commentId}`,
      userId: SUB,
      nickname: 'こまつ',
    });
  });

  test('ニックネームは投稿時点のものを保存する（あとで変えても前のコメントは変わらない）', async () => {
    const { handler, pinId } = await withPin();
    await call(handler, postComment(pinId, { text: '1つめ' }));
    await call(handler, event('PUT', '/api/me', { token: GOOD_TOKEN, body: { nickname: 'こまっちゃん', bloodType: 'A' } }));
    await call(handler, postComment(pinId, { text: '2つめ' }));
    const res = await call(handler, getComments(pinId));
    expect(res.body.comments.map((c: { nickname: string }) => c.nickname)).toEqual(['こまつ', 'こまっちゃん']);
  });

  test('本文の userId は無視し、トークンの sub を使う', async () => {
    const { handler, pinId, commentStore } = await withPin();
    await call(handler, postComment(pinId, { text: 'やあ', userId: 'someone-else' }));
    expect(commentStore[0].userId).toBe(SUB);
  });

  test('ログインしていなければ 401', async () => {
    const { handler, pinId } = await withPin();
    expect((await call(handler, postComment(pinId, { text: 'a' }, ''))).status).toBe(401);
    expect((await call(handler, postComment(pinId, { text: 'a' }, 'bad'))).status).toBe(401);
  });

  test('プロフィール未登録なら 403 PROFILE_REQUIRED。件数は増えない', async () => {
    const { handler, pinId, pinStore, store } = await withPin();
    store.clear();
    const res = await call(handler, postComment(pinId, { text: 'a' }));
    expect(res).toMatchObject({ status: 403, body: { error: 'PROFILE_REQUIRED' } });
    expect(pinStore[0].commentCount).toBe(0);
  });

  test('ピンがなければ 404。コメントは保存しない', async () => {
    const { handler, commentStore } = await withPin();
    const res = await call(handler, postComment(MISSING, { text: 'a' }));
    expect(res).toMatchObject({ status: 404, body: { error: 'NOT_FOUND' } });
    expect(commentStore).toHaveLength(0);
  });

  test('pinId の形が違えば 404', async () => {
    const { handler } = await withPin();
    expect((await call(handler, postComment('abc', { text: 'a' }))).status).toBe(404);
  });

  test.each([
    ['text がない', {}],
    ['空', { text: '' }],
    ['空白だけ', { text: '  \n ' }],
    ['101文字', { text: 'あ'.repeat(101) }],
    ['数', { text: 1 }],
    ['タブを含む', { text: 'a\tb' }],
    ['配列', ['a']],
  ])('%s は 400 VALIDATION_ERROR', async (_name, body) => {
    const { handler, pinId, pinStore } = await withPin();
    const res = await call(handler, postComment(pinId, body));
    expect(res).toMatchObject({ status: 400, body: { error: 'VALIDATION_ERROR' } });
    expect(pinStore[0].commentCount).toBe(0);
  });

  test('100文字（絵文字も1文字）と改行はOK', async () => {
    const { handler, pinId } = await withPin();
    expect((await call(handler, postComment(pinId, { text: '🦟'.repeat(100) }))).status).toBe(201);
    const res = await call(handler, postComment(pinId, { text: 'かゆい\r\nかゆい' }));
    expect(res.body.text).toBe('かゆい\nかゆい');
  });
});

describe('GET /api/pins/{pinId}/comments', () => {
  test('ログインなしで、古い順に返す。userId は返さない', async () => {
    const s = await withPin();
    s.commentStore.push(
      ...[3, 1, 2].map((n) => ({
        pinId: s.pinStore[0].pinId,
        sk: `2026-11-17T12:0${n}:00+09:00#C${n}`,
        commentId: `C${n}`,
        userId: 'secret-user',
        nickname: `人${n}`,
        text: `コメント${n}`,
        createdAt: `2026-11-17T12:0${n}:00+09:00`,
      })),
    );
    const res = await call(s.handler, getComments(s.pinId));
    expect(res.status).toBe(200);
    expect(res.body.comments.map((c: { commentId: string }) => c.commentId)).toEqual(['C1', 'C2', 'C3']);
    expect(res.body.comments[0]).toEqual({ commentId: 'C1', nickname: '人1', text: 'コメント1', createdAt: '2026-11-17T12:01:00+09:00' });
    expect(JSON.stringify(res.body)).not.toContain('secret-user');
  });

  test('最大100件', async () => {
    const s = await withPin();
    for (let i = 0; i < 105; i++) {
      s.commentStore.push({
        pinId: s.pinStore[0].pinId,
        sk: `2026-11-17T12:00:00+09:00#C${String(i).padStart(3, '0')}`,
        commentId: `C${i}`,
        userId: 'u',
        nickname: 'n',
        text: 't',
        createdAt: '2026-11-17T12:00:00+09:00',
      });
    }
    const res = await call(s.handler, getComments(s.pinId));
    expect(res.body.comments).toHaveLength(100);
    expect(res.body.comments[0].commentId).toBe('C0');
  });

  test('コメントがなければ空の配列', async () => {
    const { handler, pinId } = await withPin();
    expect(await call(handler, getComments(pinId))).toEqual({ status: 200, body: { comments: [] } });
  });

  test('ピンがない・pinId の形が違うときは 404', async () => {
    const { handler } = await withPin();
    expect((await call(handler, getComments(MISSING))).status).toBe(404);
    expect((await call(handler, getComments('nope'))).status).toBe(404);
  });

  test('末尾の / があっても同じ', async () => {
    const { handler, pinId } = await withPin();
    expect((await call(handler, event('GET', `/api/pins/${pinId}/comments/`))).status).toBe(200);
  });
});
