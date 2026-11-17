import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { ApiError } from './http';

// IDトークンを確かめて、userId（＝トークンの sub）を返す関数の型。
// テストでは本物の Cognito を使わずに差し替える。
export type VerifyIdToken = (token: string) => Promise<{ sub: string }>;

// 本物の検証。ユーザープールIDとクライアントIDは CDK から環境変数で渡される（秘密ではない）。
// 公開鍵（JWKS）は初回に Cognito から取得し、Lambda が温かいあいだは使い回す。
export function createCognitoVerifier(userPoolId: string, clientId: string): VerifyIdToken {
  const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' });
  return async (token) => {
    const payload = await verifier.verify(token);
    return { sub: payload.sub };
  };
}

// X-Id-Token ヘッダーから userId を取り出す。ない・正しくない・期限切れ → 401。
// userId はフロントから受け取らず、必ずここで得た sub を使う（AGENTS.md）。
export async function requireUserId(event: LambdaFunctionURLEvent, verify: VerifyIdToken): Promise<string> {
  // 関数URLではヘッダー名は小文字になる
  const token = event.headers?.['x-id-token'];
  if (!token) throw new ApiError('UNAUTHORIZED', 'ログインが必要です（X-Id-Token がありません）');
  try {
    const { sub } = await verify(token);
    return sub;
  } catch {
    // 理由（期限切れ・署名違いなど）は返さない。トークン自体もログに出さない
    throw new ApiError('UNAUTHORIZED', 'ログインの有効期限が切れたか、トークンが正しくありません');
  }
}
