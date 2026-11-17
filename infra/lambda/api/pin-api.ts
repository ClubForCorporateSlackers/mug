import { type Bounds, cellsForBounds, encodeGeohash, jitter, type Random } from './geo';
import type { ReverseGeocode } from './geocoder';
import { ApiError, nowJst } from './http';
import { toPublicPinId } from './pin-id';
import type { PinItem, PinSummary, PinsRepo, RankingsRepo } from './pins';
import { ulid } from './ulid';
import type { UserItem, UsersRepo } from './users';

// POST /api/pins・GET /api/pins（docs/api-spec.md の 3・4）。

export const PIN_STAMPS = ['kayui', 'itai'] as const; // ピンを立てるときのスタンプ（api-spec.md「5.」）
const MEMO_MAX = 100;
export const MAX_SPAN_DEG = 0.5;
export const MAX_PINS = 200;

// ---- 入力チェック ----

// 位置はチェックしてから jitter に渡すだけ。元の座標はこのあと保存・ログ出力・返却しない
export function validatePinInput(body: unknown): { lat: number; lng: number; stamp: string | null; memo: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('VALIDATION_ERROR', '本文は { "lat": ..., "lng": ..., "stamp": ..., "memo": ... } の形で送ってください');
  }
  const { lat, lng, stamp, memo } = body as Record<string, unknown>;

  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < 20 || lat > 46) {
    throw new ApiError('VALIDATION_ERROR', '緯度（lat）は日本の範囲（20〜46）の数で送ってください');
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < 122 || lng > 154) {
    throw new ApiError('VALIDATION_ERROR', '経度（lng）は日本の範囲（122〜154）の数で送ってください');
  }

  // スタンプは任意（未決定のため）。null か なし ならスタンプなし
  if (stamp !== undefined && stamp !== null && !(typeof stamp === 'string' && (PIN_STAMPS as readonly string[]).includes(stamp))) {
    throw new ApiError('VALIDATION_ERROR', `スタンプは ${PIN_STAMPS.join(' / ')} のどれかを選んでください`);
  }

  let text = '';
  if (memo !== undefined && memo !== null) {
    if (typeof memo !== 'string') throw new ApiError('VALIDATION_ERROR', 'メモは文字で入力してください');
    // 前後の空白は取り除き、改行は \n にそろえる。文字数は見た目の1文字に近い数え方（/api/me と同じ）
    text = memo.replace(/\r\n?/g, '\n').trim();
    if (Array.from(text).length > MEMO_MAX) {
      throw new ApiError('VALIDATION_ERROR', `メモは${MEMO_MAX}文字以内で入力してください`);
    }
    // 改行以外の制御文字（タブなど）は受け付けない
    if (/[^\P{Cc}\n]/u.test(text)) {
      throw new ApiError('VALIDATION_ERROR', 'メモに使えない文字が含まれています');
    }
  }

  return { lat, lng, stamp: (stamp as string | null | undefined) ?? null, memo: text };
}

// 数の形の文字列だけ受け付ける（"", "Infinity", "1e3", "0x10" などは不可）
function parseCoord(v: string | undefined, name: string): number {
  if (v === undefined || !/^-?\d+(\.\d+)?$/.test(v)) {
    throw new ApiError('VALIDATION_ERROR', `${name} を数で指定してください`);
  }
  return Number(v);
}

export function validateBounds(query: Record<string, string | undefined> | undefined): Bounds {
  const q = query ?? {};
  const b = {
    minLat: parseCoord(q.minLat, 'minLat'),
    maxLat: parseCoord(q.maxLat, 'maxLat'),
    minLng: parseCoord(q.minLng, 'minLng'),
    maxLng: parseCoord(q.maxLng, 'maxLng'),
  };
  if (b.minLat < -90 || b.maxLat > 90 || b.minLng < -180 || b.maxLng > 180) {
    throw new ApiError('VALIDATION_ERROR', '緯度は-90〜90、経度は-180〜180で指定してください');
  }
  if (b.minLat > b.maxLat || b.minLng > b.maxLng) {
    throw new ApiError('VALIDATION_ERROR', 'min は max 以下にしてください');
  }
  // 小数の計算の誤差（35.6〜36.1 が 0.50000000000001 になる）で弾かないよう、少しだけ余裕を持たせる
  const EPS = 1e-9;
  if (b.maxLat - b.minLat > MAX_SPAN_DEG + EPS || b.maxLng - b.minLng > MAX_SPAN_DEG + EPS) {
    throw new ApiError('VALIDATION_ERROR', `表示範囲が広すぎます（縦横それぞれ${MAX_SPAN_DEG}度まで）。地図を拡大してください`);
  }
  return b;
}

// ---- 返す形（匿名：userId・ニックネームは返さない） ----

// スタンプの件数のうち、0件の種類は返さない（取り消して0になったものを含む）
export function nonZeroReactions(r: Record<string, number> | undefined): Record<string, number> {
  return Object.fromEntries(Object.entries(r ?? {}).filter(([, n]) => n > 0));
}

// pinId は cell を含めた形（例：xn76-01JD…）にする。コメント・スタンプのAPIで Pins のキーを作るため（pin-id.ts）
export function toPinResponse(p: PinSummary) {
  return {
    pinId: toPublicPinId(p.cell, p.pinId),
    lat: p.lat,
    lng: p.lng,
    city: p.city,
    stamp: p.stamp ?? null,
    memo: p.memo ?? '',
    createdAt: p.createdAt,
    commentCount: p.commentCount ?? 0,
    reactions: nonZeroReactions(p.reactions),
  };
}

// ---- 処理 ----

export type PinDeps = {
  users: UsersRepo;
  pins: PinsRepo;
  rankings: RankingsRepo;
  reverseGeocode: ReverseGeocode;
  random?: Random;
  now?: () => Date;
};

const BLOOD_LABEL: Record<string, string> = { A: 'A型', B: 'B型', O: 'O型', AB: 'AB型', UNKNOWN: '不明' };

export async function createPin(userId: string, body: unknown, deps: PinDeps) {
  const input = validatePinInput(body);

  // プロフィール（ニックネーム・血液型）がなければ投稿できない
  const user: UserItem | undefined = await deps.users.get(userId);
  if (!user) throw new ApiError('PROFILE_REQUIRED', 'ピンを立てる前にプロフィール（ニックネームと血液型）を登録してください');

  // ここで元の座標を捨てる。以降は pos（ずらした後）だけを使う
  const pos = jitter(input.lat, input.lng, deps.random);
  const { city, cityCode } = await deps.reverseGeocode(pos.lat, pos.lng);

  const now = deps.now?.() ?? new Date();
  const createdAt = nowJst(now);
  const pinId = ulid(now.getTime());
  const item: PinItem = {
    cell: encodeGeohash(pos.lat, pos.lng),
    sk: `${createdAt}#${pinId}`,
    pinId,
    lat: pos.lat,
    lng: pos.lng,
    city,
    cityCode,
    stamp: input.stamp,
    memo: input.memo,
    userId,
    commentCount: 0,
    reactions: {},
    createdAt,
  };
  await deps.pins.put(item);

  // 件数を増やす。ピンはもう保存できているので、ここで失敗しても投稿は成功にする
  // （500 を返すと利用者がもう一度押して、同じピンが2つできるため）。失敗はログに残す
  const month = createdAt.slice(0, 7); // 日本時間の YYYY-MM
  const counters: Promise<void>[] = [
    deps.rankings.increment(month, 'user', userId, user.nickname),
    deps.rankings.increment(month, 'blood', user.bloodType, BLOOD_LABEL[user.bloodType] ?? user.bloodType),
    deps.users.incrementPinCount(userId),
  ];
  if (cityCode) counters.push(deps.rankings.increment(month, 'city', cityCode, city)); // 不明は数えない
  const results = await Promise.allSettled(counters);
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) console.error(`POST /api/pins: ${failed}件の件数の更新に失敗しました（pinId=${pinId}）`);

  const { commentCount: _c, reactions: _r, ...rest } = toPinResponse(item);
  return rest; // api-spec.md の 201 の形（commentCount・reactions は含めない）
}

export async function listPins(query: Record<string, string | undefined> | undefined, deps: Pick<PinDeps, 'pins'>) {
  const b = validateBounds(query);
  const cells = cellsForBounds(b);
  // cell ごとに新しい順に最大200件を同時に読み、範囲の中だけに絞ってまとめる
  const results = await Promise.all(cells.map((c) => deps.pins.queryCell(c, MAX_PINS)));
  const inRange = results
    .flatMap((r) => r.items)
    .filter((p) => p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng)
    .sort((x, y) => (x.sk < y.sk ? 1 : x.sk > y.sk ? -1 : 0)); // 新しい順
  // 読み切れなかった cell があれば、範囲の中にまだピンがあるかもしれないので truncated にする
  const truncated = inRange.length > MAX_PINS || results.some((r) => r.hasMore);
  return { pins: inRange.slice(0, MAX_PINS).map(toPinResponse), truncated };
}
