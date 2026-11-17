import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';
import { createHandler } from './app';
import { createCognitoVerifier } from './auth';
import { createDynamoUsersRepo } from './users';

// Lambda の入口。CDK（infra/lib/mug-stack.ts）が渡す環境変数を読んで、本物の Cognito・DynamoDB につなぐ。
// 処理の中身は app.ts にある。

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} がありません`);
  return value;
}

// 最初の呼び出しで1回だけ作り、Lambda が温かいあいだは使い回す（公開鍵のキャッシュも効く）
let app: ReturnType<typeof createHandler> | undefined;

export const handler = async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
  app ??= createHandler({
    verifyIdToken: createCognitoVerifier(requireEnv('USER_POOL_ID'), requireEnv('USER_POOL_CLIENT_ID')),
    users: createDynamoUsersRepo(requireEnv('USERS_TABLE_NAME')),
  });
  return app(event);
};
