// 実行前の確認（読むだけ。何も作らない・書かない）。
// aws login の認証情報が読めるか、スタック・ユーザープール・テーブル・APIに届くかを確かめる。
//
//   npm run check

import { DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { callApi } from './lib/api.ts';
import { loadStack } from './lib/aws.ts';
import { cognito, listSeedUsers } from './lib/cognito.ts';
import { config } from './seed.config.ts';

async function step(name: string, fn: () => Promise<string>) {
  try {
    console.log(`OK  ${name}：${await fn()}`);
    return true;
  } catch (e) {
    const err = e as { name?: string; message?: string };
    console.log(`NG  ${name}：${err.name ?? 'Error'}：${err.message ?? String(e)}`);
    return false;
  }
}

async function main() {
  let ok = await step('AWSの認証情報', async () => {
    const id = await new STSClient({ region: config.region }).send(new GetCallerIdentityCommand({}));
    // ARN の最後（ユーザー名・ロール名）だけを出す。アカウントIDは末尾4桁だけ
    return `${id.Arn?.split(':').pop()}（アカウント …${id.Account?.slice(-4)}）`;
  });
  if (!ok) {
    console.log('\n認証情報が読めません。`aws login` をやり直すか、README の「認証情報が読めないとき」を見てください。');
    process.exitCode = 1;
    return;
  }

  const stack = await loadStack().catch((e: Error) => {
    console.log(`NG  スタック ${config.stackName}：${e.name}：${e.message}`);
    return undefined;
  });
  if (!stack) {
    process.exitCode = 1;
    return;
  }
  console.log(`OK  スタック ${config.stackName}：ユーザープール ${stack.userPoolId}`);

  ok =
    (await step('アプリクライアントの設定', async () => {
      const c = await cognito.send(new DescribeUserPoolClientCommand({ UserPoolId: stack.userPoolId, ClientId: stack.clientId }));
      const flows = c.UserPoolClient?.ExplicitAuthFlows ?? [];
      if (!flows.includes('ALLOW_ADMIN_USER_PASSWORD_AUTH')) throw new Error('ADMIN_USER_PASSWORD_AUTH が許可されていません');
      return 'ADMIN_USER_PASSWORD_AUTH が使える';
    })) && ok;

  ok =
    (await step('ダミーのユーザー', async () => {
      const users = await listSeedUsers(stack.userPoolId);
      return `今いるのは ${users.length}人`;
    })) && ok;

  const ddb = new DynamoDBClient({ region: config.region });
  for (const [name, table] of Object.entries(stack.tables)) {
    ok =
      (await step(`テーブル ${name}`, async () => {
        const d = await ddb.send(new DescribeTableCommand({ TableName: table }));
        const p = d.Table?.ProvisionedThroughput;
        return `読み${p?.ReadCapacityUnits}・書き${p?.WriteCapacityUnits}ユニット`;
      })) && ok;
  }

  ok =
    (await step('API（GET /api/rankings、ログイン不要）', async () => {
      const r = await callApi<{ month: string; items: unknown[] }>('GET', '/api/rankings?type=city');
      return `${r.month} の市町村ランキング ${r.items.length}件`;
    })) && ok;

  console.log(ok ? '\nすべて確認できました。' : '\nNG のところを直してください。');
  process.exitCode = ok ? 0 : 1; // process.exit() は Windows で終了時にエラー表示が出ることがあるので使わない
}

main();
