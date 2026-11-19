import { ApiError, nowJst } from './http';
import type { PinsRepo, RankingsRepo } from './pins';
import type { UserItem } from './users';

// GET/PUT /api/me の入力チェックと返す形（docs/api-spec.md の 1・2）。

export const BLOOD_TYPES = ['A', 'B', 'O', 'AB', 'UNKNOWN'] as const;
const NICKNAME_MAX = 20;

export function validateProfile(body: unknown): { nickname: string; bloodType: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('VALIDATION_ERROR', '本文は { "nickname": ..., "bloodType": ... } の形で送ってください');
  }
  const { nickname, bloodType } = body as Record<string, unknown>;

  if (typeof nickname !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'ニックネームを入力してください');
  }
  const trimmed = nickname.trim(); // 前後の空白は取り除く（空白だけの名前を防ぐ）
  // 文字数は「見た目の1文字」に近い数え方（絵文字などを2文字と数えない）
  const length = Array.from(trimmed).length;
  if (length < 1 || length > NICKNAME_MAX) {
    throw new ApiError('VALIDATION_ERROR', `ニックネームは1〜${NICKNAME_MAX}文字で入力してください`);
  }
  // 改行やタブなどの制御文字は表示が崩れるので受け付けない
  if (/\p{Cc}/u.test(trimmed)) {
    throw new ApiError('VALIDATION_ERROR', 'ニックネームに使えない文字が含まれています');
  }

  if (typeof bloodType !== 'string' || !(BLOOD_TYPES as readonly string[]).includes(bloodType)) {
    throw new ApiError('VALIDATION_ERROR', `血液型は ${BLOOD_TYPES.join(' / ')} のどれかを選んでください`);
  }

  return { nickname: trimmed, bloodType };
}

// APIで返す形。createdAt などDBの項目をそのまま出さない
export function toMeResponse(user: UserItem) {
  return {
    userId: user.userId,
    nickname: user.nickname,
    bloodType: user.bloodType,
    pinCount: user.pinCount ?? 0,
  };
}

export type MeStatsDeps = { pins: PinsRepo; rankings: RankingsRepo; now?: () => Date };

// GET /api/me だけで足す数（PR #16 の api-spec.md「8.」の「今ある API に足す項目」。docs/decisions.md #38）。
// - monthCount：今月（日本時間）に立てて、まだ残っているピンの数。Rankings の今月の「人」の行から読む（ランキングと同じ数）
// - odaijiReceived：今残っている自分のピンがもらった「お大事に」の合計（自分で押した分も含む）。索引 byUser で数える
// 読み込みに失敗したら undefined（呼ぶ側は項目を付けずに 200 にする。画面のログインの確認を止めないため）
export async function loadMeStats(
  userId: string,
  deps: MeStatsDeps,
): Promise<{ monthCount: number; odaijiReceived: number } | undefined> {
  const month = nowJst(deps.now?.() ?? new Date()).slice(0, 7); // 日本時間の YYYY-MM（ピンを立てるときと同じ決め方）
  try {
    const [monthCount, odaijiReceived] = await Promise.all([
      deps.rankings.getCount(month, 'user', userId),
      deps.pins.sumReactionsByUser(userId, 'odaiji'),
    ]);
    return { monthCount, odaijiReceived };
  } catch (e) {
    // userId やトークンは出さない。エラーの種類だけ残す
    console.error('GET /api/me stats failed:', e instanceof Error ? `${e.name}: ${e.message}` : 'unknown');
    return undefined;
  }
}
