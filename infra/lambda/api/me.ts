import { ApiError } from './http';
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
