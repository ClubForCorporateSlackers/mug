import type { CommentsRepo } from './comments';
import { ApiError, nowJst } from './http';
import { type PinKey, parsePublicPinId } from './pin-id';
import type { PinsRepo } from './pins';
import { ulid } from './ulid';
import type { UsersRepo } from './users';

// GET/POST /api/pins/{pinId}/comments（docs/api-spec.md の 5・6）。

const TEXT_MAX = 100;
export const MAX_COMMENTS = 100;

export type CommentDeps = {
  users: UsersRepo;
  pins: PinsRepo;
  comments: CommentsRepo;
  now?: () => Date;
};

// URL の pinId を Pins のキーにする。形が正しくなければ「そのピンはない」として 404
export function requirePinKey(publicId: string): PinKey {
  const key = parsePublicPinId(publicId);
  if (!key) throw new ApiError('NOT_FOUND', 'ピンが見つかりません');
  return key;
}

// コメントの文字。数え方はピンのメモと同じ（前後の空白を除く、絵文字も1文字、改行は使える）
export function validateCommentInput(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('VALIDATION_ERROR', '本文は { "text": ... } の形で送ってください');
  }
  const { text } = body as Record<string, unknown>;
  if (typeof text !== 'string') throw new ApiError('VALIDATION_ERROR', 'コメントを入力してください');
  const trimmed = text.replace(/\r\n?/g, '\n').trim();
  const length = Array.from(trimmed).length;
  if (length < 1 || length > TEXT_MAX) {
    throw new ApiError('VALIDATION_ERROR', `コメントは1〜${TEXT_MAX}文字で入力してください`);
  }
  // 改行以外の制御文字（タブなど）は受け付けない
  if (/[^\P{Cc}\n]/u.test(trimmed)) {
    throw new ApiError('VALIDATION_ERROR', 'コメントに使えない文字が含まれています');
  }
  return trimmed;
}

export async function listComments(publicId: string, deps: CommentDeps) {
  const key = requirePinKey(publicId);
  if (!(await deps.pins.exists(key))) throw new ApiError('NOT_FOUND', 'ピンが見つかりません');
  const items = await deps.comments.list(key.pinId, MAX_COMMENTS);
  return {
    comments: items.map((c) => ({ commentId: c.commentId, nickname: c.nickname, text: c.text, createdAt: c.createdAt })),
  };
}

// 順番：ログイン 401（呼ぶ前）→ pinId の形 404 → 入力 400 → プロフィール 403 → ピンがない 404
export async function createComment(userId: string, publicId: string, body: unknown, deps: CommentDeps) {
  const key = requirePinKey(publicId);
  const text = validateCommentInput(body);

  const user = await deps.users.get(userId);
  if (!user) throw new ApiError('PROFILE_REQUIRED', 'コメントする前にプロフィール（ニックネームと血液型）を登録してください');

  // 先に Pins の commentCount を増やす。ピンがなければここで 404（コメントは保存しない）。
  // このあとコメントの保存に失敗すると件数が1多くなるが、ハッカソンでは許す（docs/adr/feature-api-social.md）
  if (!(await deps.pins.incrementCommentCount(key))) throw new ApiError('NOT_FOUND', 'ピンが見つかりません');

  const now = deps.now?.() ?? new Date();
  const createdAt = nowJst(now);
  const commentId = ulid(now.getTime());
  await deps.comments.put({
    pinId: key.pinId,
    sk: `${createdAt}#${commentId}`,
    commentId,
    userId,
    nickname: user.nickname, // 投稿時点のニックネームをコピーして保存
    text,
    createdAt,
  });
  return { commentId, nickname: user.nickname, text, createdAt };
}
