import { requirePinKey } from './comment-api';
import { ApiError, nowJst } from './http';
import { nonZeroReactions } from './pin-api';
import type { PinsRepo } from './pins';
import type { ReactionsRepo } from './reactions';
import type { UsersRepo } from './users';

// PUT/DELETE /api/pins/{pinId}/reactions/{type}（docs/api-spec.md の 7・8）。

// 他人のピンに押せるスタンプ（api-spec.md「5.」）。ピンを立てるときの kayui・itai は押せない
export const REACTION_TYPES = ['odaiji', 'kaite', 'wakaru'] as const;

export type ReactionDeps = {
  users: UsersRepo;
  pins: PinsRepo;
  reactions: ReactionsRepo;
  now?: () => Date;
};

// 順番：ログイン 401（呼ぶ前）→ pinId の形 404 → 種類 400 → プロフィール 403 → ピンがない 404
export async function setReaction(userId: string, publicId: string, type: string, on: boolean, deps: ReactionDeps) {
  const key = requirePinKey(publicId);
  if (!(REACTION_TYPES as readonly string[]).includes(type)) {
    throw new ApiError('VALIDATION_ERROR', `スタンプは ${REACTION_TYPES.join(' / ')} のどれかを選んでください`);
  }
  const user = await deps.users.get(userId);
  if (!user) throw new ApiError('PROFILE_REQUIRED', 'スタンプを押す前にプロフィール（ニックネームと血液型）を登録してください');

  // Reactions と Pins の件数をまとめて書く。もう押している（取り消し済み）なら何も書かない
  const result = on
    ? await deps.reactions.add(key, { type, userId, nickname: user.nickname, createdAt: nowJst(deps.now?.() ?? new Date()) })
    : await deps.reactions.remove(key, type, userId);
  if (result === 'no-pin') throw new ApiError('NOT_FOUND', 'ピンが見つかりません');

  // 返す件数は、書いた直後の値（強い整合性の読み込み）。
  // 自分が押したものは、今の種類は結果から分かるので、残りの種類だけ読む
  const [counts, ...others] = await Promise.all([
    deps.pins.getReactions(key),
    ...REACTION_TYPES.filter((t) => t !== type).map(async (t) => ((await deps.reactions.has(key.pinId, t, userId)) ? t : null)),
  ]);
  if (!counts) throw new ApiError('NOT_FOUND', 'ピンが見つかりません');
  const mine = new Set([...others, on ? type : null]);
  return {
    reactions: nonZeroReactions(counts),
    myReactions: REACTION_TYPES.filter((t) => mine.has(t)),
  };
}
