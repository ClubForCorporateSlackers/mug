import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { createHandler, type Deps } from '../lambda/api/app';
import type { CommentItem } from '../lambda/api/comments';
import type { City } from '../lambda/api/geocoder';
import type { PinItem, PinSummary } from '../lambda/api/pins';
import { reactionSk, type ReactionItem } from '../lambda/api/reactions';
import type { UserItem } from '../lambda/api/users';

// テスト用の偽物（メモリ上の DB・地理院API）。本物の AWS や国土地理院にはつながない。

export const GOOD_TOKEN = 'good-token';
export const SUB = 'user-sub-123';

export function setup(
  opts: { users?: UserItem[]; pins?: PinItem[]; comments?: CommentItem[]; city?: City; overrides?: Partial<Deps> } = {},
) {
  const store = new Map((opts.users ?? []).map((u) => [u.userId, { ...u }]));
  const pinStore: PinItem[] = (opts.pins ?? []).map((p) => ({ ...p, reactions: { ...p.reactions } }));
  const commentStore: CommentItem[] = [...(opts.comments ?? [])];
  const reactionStore = new Map<string, ReactionItem>(); // キー：pinId|sk
  const findPin = (key: { cell: string; sk: string }) => pinStore.find((p) => p.cell === key.cell && p.sk === key.sk);
  const rankings = new Map<string, { label: string; count: number }>();
  const geocodeCalls: { lat: number; lng: number }[] = [];
  const queriedCells: string[] = [];

  const deps: Deps = {
    verifyIdToken: async (token) => {
      if (token !== GOOD_TOKEN) throw new Error('invalid');
      return { sub: SUB };
    },
    users: {
      async get(userId) {
        return store.get(userId);
      },
      async saveProfile(userId, nickname, bloodType, now) {
        const old = store.get(userId);
        // 本物（users.ts の UpdateItem）と同じく、createdAt と pinCount はないときだけ入れる
        const item: UserItem = {
          ...old,
          userId,
          nickname,
          bloodType,
          updatedAt: now,
          createdAt: old?.createdAt ?? now,
          pinCount: old?.pinCount ?? 0,
        };
        store.set(userId, item);
        return item;
      },
      async incrementPinCount(userId) {
        const u = store.get(userId);
        if (u) u.pinCount = (u.pinCount ?? 0) + 1;
      },
      // 本物と同じく、0 以下・項目がないときは減らさない
      async decrementPinCount(userId) {
        const u = store.get(userId);
        if (u && (u.pinCount ?? 0) > 0) u.pinCount = (u.pinCount ?? 0) - 1;
      },
    },
    pins: {
      async put(item) {
        pinStore.push({ ...item });
      },
      async queryCell(cell, limit) {
        queriedCells.push(cell);
        const all = pinStore.filter((p) => p.cell === cell).sort((a, b) => (a.sk < b.sk ? 1 : -1));
        // 本物と同じく userId・cityCode・bloodType は読まない
        const items: PinSummary[] = all
          .slice(0, limit)
          .map(({ userId: _u, cityCode: _cc, bloodType: _b, ...rest }) => rest);
        return { items, hasMore: all.length > limit };
      },
      async exists(key) {
        return findPin(key) !== undefined;
      },
      async incrementCommentCount(key) {
        const p = findPin(key);
        if (!p) return false;
        p.commentCount += 1;
        return true;
      },
      async getReactions(key) {
        const p = findPin(key);
        return p ? { ...p.reactions } : undefined;
      },
      // 本物と同じく、自分のピンのときだけ書き換え・消し、前の中身を返す
      async updateOwned(key, userId, changes) {
        const p = findPin(key);
        if (!p) return { kind: 'not-found' };
        if (p.userId !== userId) return { kind: 'not-owner' };
        const old = { ...p, reactions: { ...p.reactions } };
        Object.assign(p, Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)));
        return { kind: 'ok', old };
      },
      async deleteOwned(key, userId) {
        const p = findPin(key);
        if (!p) return { kind: 'not-found' };
        if (p.userId !== userId) return { kind: 'not-owner' };
        pinStore.splice(pinStore.indexOf(p), 1);
        return { kind: 'ok', old: p };
      },
    },
    // 本物のトランザクションと同じく、ピンがないか条件に合わなければ何も書かない
    reactions: {
      async add(key, item) {
        const p = findPin(key);
        if (!p) return 'no-pin';
        const k = `${key.pinId}|${reactionSk(item.type, item.userId)}`;
        if (reactionStore.has(k)) return 'already';
        reactionStore.set(k, { pinId: key.pinId, sk: reactionSk(item.type, item.userId), ...item });
        p.reactions[item.type] = (p.reactions[item.type] ?? 0) + 1;
        return 'added';
      },
      async remove(key, type, userId) {
        const p = findPin(key);
        if (!p) return 'no-pin';
        const k = `${key.pinId}|${reactionSk(type, userId)}`;
        if (!reactionStore.delete(k)) return 'absent';
        p.reactions[type] = (p.reactions[type] ?? 1) - 1;
        return 'removed';
      },
      async has(pinId, type, userId) {
        return reactionStore.has(`${pinId}|${reactionSk(type, userId)}`);
      },
      async deleteAll(pinId, shouldStop) {
        let deleted = 0;
        for (const k of [...reactionStore.keys()].filter((k) => k.startsWith(`${pinId}|`))) {
          if (shouldStop()) return { deleted, stopped: true };
          reactionStore.delete(k);
          deleted++;
        }
        return { deleted, stopped: false };
      },
    },
    comments: {
      async put(item) {
        commentStore.push({ ...item });
      },
      async list(pinId, limit) {
        return commentStore
          .filter((c) => c.pinId === pinId)
          .sort((a, b) => (a.sk < b.sk ? -1 : 1)) // 古い順
          .slice(0, limit)
          .map(({ commentId, nickname, text, createdAt }) => ({ commentId, nickname, text, createdAt }));
      },
      async deleteAll(pinId, shouldStop) {
        let deleted = 0;
        for (const c of commentStore.filter((c) => c.pinId === pinId)) {
          if (shouldStop()) return { deleted, stopped: true };
          commentStore.splice(commentStore.indexOf(c), 1);
          deleted++;
        }
        return { deleted, stopped: false };
      },
    },
    rankings: {
      async increment(month, kind, key, label) {
        const k = `${month}#${kind}|${key}`;
        rankings.set(k, { label, count: (rankings.get(k)?.count ?? 0) + 1 });
      },
      async list(month, kind, limit) {
        const prefix = `${month}#${kind}|`;
        return [...rankings]
          .filter(([k]) => k.startsWith(prefix))
          .map(([k, v]) => ({ key: k.slice(prefix.length), ...v }))
          .sort((a, b) => (a.key < b.key ? -1 : 1)) // 本物と同じく key の順
          .slice(0, limit);
      },
      // 本物と同じく、行がないか0件なら何もしない（行は消さない）
      async decrement(month, kind, key) {
        const row = rankings.get(`${month}#${kind}|${key}`);
        if (row && row.count > 0) row.count -= 1;
      },
    },
    reverseGeocode: async (lat, lng) => {
      geocodeCalls.push({ lat, lng });
      return opts.city ?? { city: '東京都千代田区', cityCode: '13101' };
    },
    // 決まった乱数（距離 0.64→80m、角度 0.1→北東寄り）。交互に返す
    random: (() => {
      let i = 0;
      return () => [0.64, 0.1][i++ % 2];
    })(),
    now: () => new Date('2026-11-17T03:00:00Z'), // 日本時間 12:00
    ...opts.overrides,
  };
  return { handler: createHandler(deps), store, pinStore, commentStore, reactionStore, rankings, geocodeCalls, queriedCells };
}

export function event(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; query?: Record<string, string> } = {},
): LambdaFunctionURLEvent {
  const headers: Record<string, string> = {};
  if (opts.token) headers['x-id-token'] = opts.token;
  return {
    rawPath: path,
    headers,
    queryStringParameters: opts.query,
    body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
    isBase64Encoded: false,
    requestContext: { http: { method } },
  } as unknown as LambdaFunctionURLEvent;
}

export async function call(h: ReturnType<typeof setup>['handler'], e: LambdaFunctionURLEvent) {
  const res = await h(e);
  return { status: res.statusCode, body: JSON.parse(res.body ?? 'null') };
}
