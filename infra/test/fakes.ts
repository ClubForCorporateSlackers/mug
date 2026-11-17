import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { createHandler, type Deps } from '../lambda/api/app';
import type { City } from '../lambda/api/geocoder';
import type { PinItem, PinSummary } from '../lambda/api/pins';
import type { UserItem } from '../lambda/api/users';

// テスト用の偽物（メモリ上の DB・地理院API）。本物の AWS や国土地理院にはつながない。

export const GOOD_TOKEN = 'good-token';
export const SUB = 'user-sub-123';

export function setup(opts: { users?: UserItem[]; pins?: PinItem[]; city?: City; overrides?: Partial<Deps> } = {}) {
  const store = new Map((opts.users ?? []).map((u) => [u.userId, { ...u }]));
  const pinStore: PinItem[] = [...(opts.pins ?? [])];
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
    },
    pins: {
      async put(item) {
        pinStore.push({ ...item });
      },
      async queryCell(cell, limit) {
        queriedCells.push(cell);
        const all = pinStore.filter((p) => p.cell === cell).sort((a, b) => (a.sk < b.sk ? 1 : -1));
        // 本物と同じく userId・cityCode・cell は読まない
        const items: PinSummary[] = all.slice(0, limit).map(({ cell: _c, userId: _u, cityCode: _cc, ...rest }) => rest);
        return { items, hasMore: all.length > limit };
      },
    },
    rankings: {
      async increment(month, kind, key, label) {
        const k = `${month}#${kind}|${key}`;
        rankings.set(k, { label, count: (rankings.get(k)?.count ?? 0) + 1 });
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
  return { handler: createHandler(deps), store, pinStore, rankings, geocodeCalls, queriedCells };
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
