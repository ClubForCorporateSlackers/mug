import { requirePinKey } from './comment-api';
import type { CommentsRepo } from './comments';
import { jitterWithinCell } from './geo';
import { ApiError } from './http';
import { type PinDeps, toSavedPinResponse, validatePinPatchInput } from './pin-api';
import { toPublicPinId } from './pin-id';
import type { OwnedResult, PinChanges, PinItem } from './pins';
import type { ReactionsRepo } from './reactions';

// PATCH /api/pins/{pinId}・DELETE /api/pins/{pinId}（PR #16 の docs/api-spec.md「8.」の #10・#11）。
// 決めたことと理由は docs/adr/feature-api-pins-edit.md。
// 注意：元の座標（本文の lat・lng）は保存・ログ出力・返却しない。ログには件数と pinId だけを出す。

export type PinEditDeps = PinDeps & {
  comments: CommentsRepo;
  reactions: ReactionsRepo;
  // コメント・スタンプを消すのをやめる時刻（Date.now() の値）。Lambda の制限時間（10秒）の前に返事をするため
  deleteBudgetMs?: number;
};

const DELETE_BUDGET_MS = 6000;

// 自分のピンでなければ 403、なければ 404
function requireOwned(r: OwnedResult): PinItem {
  if (r.kind === 'not-found') throw new ApiError('NOT_FOUND', 'ピンが見つかりません');
  if (r.kind === 'not-owner') throw new ApiError('NOT_OWNER', '自分が立てたピンだけ変更・削除できます');
  return r.old;
}

// 件数の更新をまとめて行う。失敗してもエラーにはしない（ピンはもう書き換え済み・消し済みのため。decisions.md #26 と同じ考え方）
async function settleCounters(label: string, pinId: string, counters: Promise<void>[]) {
  const results = await Promise.allSettled(counters);
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) console.error(`${label}: ${failed}件の件数の更新に失敗しました（pinId=${pinId}）`);
}

// 順番：ログイン 401（呼ぶ前）→ pinId の形 404 → 入力 400 → 区画をまたぐ 400 → 自分のピンか 403・あるか 404
export async function updatePin(userId: string, publicId: string, body: unknown, deps: PinEditDeps) {
  const key = requirePinKey(publicId);
  const input = validatePinPatchInput(body);

  const changes: PinChanges = {};
  if (input.stamp !== undefined) changes.stamp = input.stamp;
  if (input.memo !== undefined) changes.memo = input.memo;
  if (input.position) {
    // もう一度100mずらす。ここで元の座標を捨て、以降は pos（ずらした後）だけを使う。
    // 区画（cell）が変わると pinId が変わるので、区画の中に入るまでずらし直す（geo.ts の jitterWithinCell）
    const pos = jitterWithinCell(input.position.lat, input.position.lng, key.cell, deps.random);
    if (!pos) {
      throw new ApiError('VALIDATION_ERROR', 'その位置には動かせません。遠くへ動かすときは、ピンを消して立て直してください');
    }
    const { city, cityCode } = await deps.reverseGeocode(pos.lat, pos.lng);
    Object.assign(changes, { lat: pos.lat, lng: pos.lng, city, cityCode });
  }

  // 自分のピンのときだけ書き換え、書き換える前の中身を受け取る（読んでから書く、の間に変わる心配がない）
  const old = requireOwned(await deps.pins.updateOwned(key, userId, changes));
  const updated: PinItem = { ...old, ...changes };

  // 市町村が変わったら、ピンを立てた月の市町村ランキングを付け替える（「不明」の側は数えない）
  if (input.position && old.cityCode !== updated.cityCode) {
    const month = old.createdAt.slice(0, 7);
    const counters: Promise<void>[] = [];
    if (old.cityCode) counters.push(deps.rankings.decrement(month, 'city', old.cityCode));
    if (updated.cityCode) counters.push(deps.rankings.increment(month, 'city', updated.cityCode, updated.city));
    await settleCounters('PATCH /api/pins', key.pinId, counters);
  }

  return toSavedPinResponse(updated);
}

// 順番：ログイン 401（呼ぶ前）→ pinId の形 404 → 自分のピンか 403・あるか 404
// ピンを最初に消す。件数を減らすのは「実際にピンを消せたリクエスト」の1回だけになり、
// 途中で失敗してもう一度押されても、2回目は 404 で件数を二重に減らさない
export async function deletePin(userId: string, publicId: string, deps: PinEditDeps) {
  const key = requirePinKey(publicId);
  const old = requireOwned(await deps.pins.deleteOwned(key, userId));

  // ランキング（人・市町村・血液型）と pinCount を、ピンを立てた月の分だけ1減らす
  const month = old.createdAt.slice(0, 7);
  // 血液型は、立てたときの値（ピンに保存）を使う。古いピンにはないので、そのときだけ今のプロフィールの値
  let bloodType = old.bloodType;
  if (!bloodType) {
    try {
      bloodType = (await deps.users.get(userId))?.bloodType;
    } catch {
      console.error(`DELETE /api/pins: 血液型の読み込みに失敗しました（pinId=${key.pinId}）`);
    }
  }
  const counters: Promise<void>[] = [
    deps.rankings.decrement(month, 'user', userId),
    deps.users.decrementPinCount(userId),
  ];
  if (old.cityCode) counters.push(deps.rankings.decrement(month, 'city', old.cityCode));
  if (bloodType) counters.push(deps.rankings.decrement(month, 'blood', bloodType));
  await settleCounters('DELETE /api/pins', key.pinId, counters);

  // コメント・スタンプを消す。ピンはもうないので、残っても画面には出ない（新しく付けることもできない）
  const deadline = Date.now() + (deps.deleteBudgetMs ?? DELETE_BUDGET_MS);
  const shouldStop = () => Date.now() > deadline;
  const children = await Promise.allSettled([
    deps.comments.deleteAll(key.pinId, shouldStop),
    deps.reactions.deleteAll(key.pinId, shouldStop),
  ]);
  children.forEach((r, i) => {
    const what = i === 0 ? 'コメント' : 'スタンプ';
    if (r.status === 'rejected') console.error(`DELETE /api/pins: ${what}を消す途中で失敗しました（pinId=${key.pinId}）`);
    else if (r.value.stopped) {
      console.error(`DELETE /api/pins: 時間切れで${what}を消しきれませんでした（${r.value.deleted}件消した。pinId=${key.pinId}）`);
    }
  });

  return { pinId: toPublicPinId(key.cell, key.pinId) };
}
