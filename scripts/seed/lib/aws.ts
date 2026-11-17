import { CloudFormationClient, DescribeStackResourcesCommand, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { config } from '../seed.config.ts';

// AWS の認証情報は、SDK の既定の読み方で読む（環境変数 → ~/.aws の設定 → aws login のキャッシュ など）。
// このスクリプトはキーを受け取らない・表示しない。

export type StackInfo = {
  userPoolId: string;
  clientId: string;
  tables: { Users: string; Pins: string; Comments: string; Reactions: string; Rankings: string };
};

const TABLE_IDS = ['Users', 'Pins', 'Comments', 'Reactions', 'Rankings'] as const;

// CloudFormation（CDK のスタック）から、ユーザープールID・クライアントID・テーブル名を読む（読むだけ）。
// 環境変数 SEED_USER_POOL_ID・SEED_CLIENT_ID があればそちらを使う。
export async function loadStack(): Promise<StackInfo> {
  const cfn = new CloudFormationClient({ region: config.region });
  const stacks = await cfn.send(new DescribeStacksCommand({ StackName: config.stackName }));
  const outputs = Object.fromEntries((stacks.Stacks?.[0]?.Outputs ?? []).map((o) => [o.OutputKey, o.OutputValue]));
  const userPoolId = process.env.SEED_USER_POOL_ID ?? outputs.UserPoolId;
  const clientId = process.env.SEED_CLIENT_ID ?? outputs.UserPoolClientId;
  if (!userPoolId || !clientId) throw new Error(`${config.stackName} の出力に UserPoolId・UserPoolClientId がありません`);

  // テーブル名は CDK が自動で付けるので、論理ID（例：UsersTableXXXX）から探す
  const res = await cfn.send(new DescribeStackResourcesCommand({ StackName: config.stackName }));
  const tables = {} as StackInfo['tables'];
  for (const id of TABLE_IDS) {
    const r = res.StackResources?.find(
      (x) => x.ResourceType === 'AWS::DynamoDB::Table' && x.LogicalResourceId?.startsWith(`${id}Table`),
    );
    if (!r?.PhysicalResourceId) throw new Error(`テーブル ${id} が ${config.stackName} に見つかりません`);
    tables[id] = r.PhysicalResourceId;
  }
  return { userPoolId, clientId, tables };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 前の呼び出しから intervalMs 以上あけてから進む（書き込みの速さをそろえる）
export function pacer(intervalMs: number) {
  let last = 0;
  return async () => {
    const wait = last + intervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
  };
}
