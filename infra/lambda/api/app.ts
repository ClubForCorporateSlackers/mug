import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { requireUserId, type VerifyIdToken } from './auth';
import { ApiError, type ApiResult, errorResponse, json, nowJst, parseJsonBody } from './http';
import { toMeResponse, validateProfile } from './me';
import { createPin, listPins, type PinDeps } from './pin-api';

// APIの振り分け。外の世界（Cognito・DynamoDB）は deps で受け取るので、テストでは偽物に差し替えられる。
// 注意：event をそのまま console.log しない（ピンのAPIで元の座標が入るため。トークンも入っている）。

export type Deps = PinDeps & {
  verifyIdToken: VerifyIdToken;
};

type Route = (event: LambdaFunctionURLEvent, deps: Deps) => Promise<ApiResult>;

// 「メソッド パス」→ 処理。APIを増やすときはここに1行足す
const routes: Record<string, Route> = {
  // 疎通確認用（残しておく）
  'GET /api/hello': async () => json(200, { message: 'hello' }),

  'GET /api/me': async (event, deps) => {
    const userId = await requireUserId(event, deps.verifyIdToken);
    const user = await deps.users.get(userId);
    if (!user) throw new ApiError('NOT_FOUND', 'プロフィールがまだ登録されていません');
    return json(200, toMeResponse(user));
  },

  'PUT /api/me': async (event, deps) => {
    const userId = await requireUserId(event, deps.verifyIdToken);
    const { nickname, bloodType } = validateProfile(parseJsonBody(event));
    const user = await deps.users.saveProfile(userId, nickname, bloodType, nowJst());
    return json(200, toMeResponse(user));
  },

  // ピンを立てる（ログイン必須・プロフィール必須）。順番：ログイン 401 → 入力 400 → プロフィール 403
  'POST /api/pins': async (event, deps) => {
    const userId = await requireUserId(event, deps.verifyIdToken);
    return json(201, await createPin(userId, parseJsonBody(event), deps));
  },

  // 地図の範囲内のピン（ログイン不要）
  'GET /api/pins': async (event, deps) => json(200, await listPins(event.queryStringParameters, deps)),
};

export function createHandler(deps: Deps) {
  return async (event: LambdaFunctionURLEvent): Promise<ApiResult> => {
    const method = event.requestContext.http.method;
    // 末尾の / は無視する（/api/me/ も /api/me として扱う）
    const path = event.rawPath.length > 1 ? event.rawPath.replace(/\/+$/, '') : event.rawPath;
    const route = routes[`${method} ${path}`];

    try {
      if (!route) throw new ApiError('NOT_FOUND', 'そのAPIはありません');
      return await route(event, deps);
    } catch (e) {
      if (e instanceof ApiError) return errorResponse(e.code, e.message);
      // 想定外のエラー。ログにはメソッド・パスとエラーの種類だけを出す（本文やヘッダーは出さない）
      console.error(`${method} ${path} failed:`, e instanceof Error ? `${e.name}: ${e.message}` : 'unknown');
      return errorResponse('INTERNAL_ERROR', 'サーバーでエラーが起きました');
    }
  };
}
