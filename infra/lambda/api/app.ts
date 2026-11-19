import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { optionalUserId, requireUserId, type VerifyIdToken } from './auth';
import { ApiError, type ApiResult, errorResponse, json, nowJst, parseJsonBody } from './http';
import { type CommentDeps, createComment, listComments } from './comment-api';
import { loadMeStats, toMeResponse, validateProfile } from './me';
import { createPin, listMyPins, listPins } from './pin-api';
import { deletePin, type PinEditDeps, updatePin } from './pin-edit-api';
import { getRanking } from './ranking-api';
import { getReactions, type ReactionDeps, setReaction } from './reaction-api';

// APIの振り分け。外の世界（Cognito・DynamoDB）は deps で受け取るので、テストでは偽物に差し替えられる。
// 注意：event をそのまま console.log しない（ピンのAPIで元の座標が入るため。トークンも入っている）。

export type Deps = PinEditDeps &
  CommentDeps &
  ReactionDeps & {
    verifyIdToken: VerifyIdToken;
  };

// params は、パスの中の {pinId} などの値（下の paramRoutes で使う）
type Route = (event: LambdaFunctionURLEvent, deps: Deps, params: string[]) => Promise<ApiResult>;

// 「メソッド パス」→ 処理。APIを増やすときはここに1行足す
const routes: Record<string, Route> = {
  // 疎通確認用（残しておく）
  'GET /api/hello': async () => json(200, { message: 'hello' }),

  'GET /api/me': async (event, deps) => {
    const userId = await requireUserId(event, deps.verifyIdToken);
    const user = await deps.users.get(userId);
    if (!user) throw new ApiError('NOT_FOUND', 'プロフィールがまだ登録されていません');
    // 未登録（404）のときは数を読まない。数を読めなければ、その2つを付けずに返す（docs/decisions.md #38）
    const stats = await loadMeStats(userId, deps);
    return json(200, { ...toMeResponse(user), ...stats });
  },

  'PUT /api/me': async (event, deps) => {
    const userId = await requireUserId(event, deps.verifyIdToken);
    const { nickname, bloodType } = validateProfile(parseJsonBody(event));
    const user = await deps.users.saveProfile(userId, nickname, bloodType, nowJst());
    return json(200, toMeResponse(user));
  },

  // 自分のピンの一覧（ログイン必須。プロフィールは確かめない：ピンがなければ空の一覧になるだけのため）
  'GET /api/me/pins': async (event, deps) => {
    const userId = await requireUserId(event, deps.verifyIdToken);
    return json(200, await listMyPins(userId, deps));
  },

  // ピンを立てる（ログイン必須・プロフィール必須）。順番：ログイン 401 → 入力 400 → プロフィール 403
  'POST /api/pins': async (event, deps) => {
    const userId = await requireUserId(event, deps.verifyIdToken);
    return json(201, await createPin(userId, parseJsonBody(event), deps));
  },

  // 地図の範囲内のピン（ログイン不要）
  'GET /api/pins': async (event, deps) => json(200, await listPins(event.queryStringParameters, deps)),

  // ランキング（ログイン不要）
  'GET /api/rankings': async (event, deps) => json(200, await getRanking(event.queryStringParameters, deps)),
};

// パスに値（{pinId} など）が入るAPI。[メソッド, パスの形, 処理]。( ) の部分が params に入る
const paramRoutes: [string, RegExp, Route][] = [
  // 自分のピンを直す・消す（ログイン必須。プロフィールは確かめない：自分のピンかどうかで十分なため）
  [
    'PATCH',
    /^\/api\/pins\/([^/]+)$/,
    async (event, deps, [pinId]) => {
      const userId = await requireUserId(event, deps.verifyIdToken);
      return json(200, await updatePin(userId, pinId, parseJsonBody(event), deps));
    },
  ],
  [
    'DELETE',
    /^\/api\/pins\/([^/]+)$/,
    async (event, deps, [pinId]) => {
      const userId = await requireUserId(event, deps.verifyIdToken);
      return json(200, await deletePin(userId, pinId, deps));
    },
  ],
  // コメント一覧（ログイン不要）
  ['GET', /^\/api\/pins\/([^/]+)\/comments$/, async (_event, deps, [pinId]) => json(200, await listComments(pinId, deps))],
  // コメントする（ログイン必須・プロフィール必須）
  [
    'POST',
    /^\/api\/pins\/([^/]+)\/comments$/,
    async (event, deps, [pinId]) => {
      const userId = await requireUserId(event, deps.verifyIdToken);
      return json(201, await createComment(userId, pinId, parseJsonBody(event), deps));
    },
  ],
  // スタンプの数と自分が押したもの（ログイン不要。X-Id-Token があれば myReactions に自分の分を入れる）
  [
    'GET',
    /^\/api\/pins\/([^/]+)\/reactions$/,
    async (event, deps, [pinId]) => {
      const userId = await optionalUserId(event, deps.verifyIdToken);
      return json(200, await getReactions(userId, pinId, deps));
    },
  ],
  // スタンプを押す・取り消す（ログイン必須・プロフィール必須）。本文はなし
  [
    'PUT',
    /^\/api\/pins\/([^/]+)\/reactions\/([^/]+)$/,
    async (event, deps, [pinId, type]) => {
      const userId = await requireUserId(event, deps.verifyIdToken);
      return json(200, await setReaction(userId, pinId, type, true, deps));
    },
  ],
  [
    'DELETE',
    /^\/api\/pins\/([^/]+)\/reactions\/([^/]+)$/,
    async (event, deps, [pinId, type]) => {
      const userId = await requireUserId(event, deps.verifyIdToken);
      return json(200, await setReaction(userId, pinId, type, false, deps));
    },
  ],
];

// 「メソッド パス」に合う処理と params を探す
function findRoute(method: string, path: string): { route: Route; params: string[] } | undefined {
  const exact = routes[`${method} ${path}`];
  if (exact) return { route: exact, params: [] };
  for (const [m, pattern, route] of paramRoutes) {
    const match = m === method ? pattern.exec(path) : null;
    if (match) return { route, params: match.slice(1).map(safeDecode) };
  }
  return undefined;
}

// %xx の形をもとに戻す。壊れた形ならそのまま（このあと pinId の形のチェックで 404 になる）
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function createHandler(deps: Deps) {
  return async (event: LambdaFunctionURLEvent): Promise<ApiResult> => {
    const method = event.requestContext.http.method;
    // 末尾の / は無視する（/api/me/ も /api/me として扱う）
    const path = event.rawPath.length > 1 ? event.rawPath.replace(/\/+$/, '') : event.rawPath;
    const found = findRoute(method, path);

    try {
      if (!found) throw new ApiError('NOT_FOUND', 'そのAPIはありません');
      return await found.route(event, deps, found.params);
    } catch (e) {
      if (e instanceof ApiError) return errorResponse(e.code, e.message);
      // 想定外のエラー。ログにはメソッド・パスとエラーの種類だけを出す（本文やヘッダーは出さない）
      console.error(`${method} ${path} failed:`, e instanceof Error ? `${e.name}: ${e.message}` : 'unknown');
      return errorResponse('INTERNAL_ERROR', 'サーバーでエラーが起きました');
    }
  };
}
