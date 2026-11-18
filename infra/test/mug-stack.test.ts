import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MugStack } from '../lib/mug-stack';

const template = Template.fromStack(new MugStack(new cdk.App(), 'TestStack'));

test('DynamoDB はプロビジョンドで5テーブル、合計 読み書き各25ユニット以内', () => {
  const tables = Object.values(template.findResources('AWS::DynamoDB::Table'));
  expect(tables).toHaveLength(5);
  let read = 0;
  let write = 0;
  for (const t of tables) {
    expect(t.Properties.BillingMode).toBeUndefined(); // 指定なし＝プロビジョンド（オンデマンドではない）
    expect(t.Properties.PointInTimeRecoverySpecification).toBeUndefined();
    expect(t.Properties.StreamSpecification).toBeUndefined();
    expect(t.DeletionPolicy).toBe('Delete');
    read += t.Properties.ProvisionedThroughput.ReadCapacityUnits;
    write += t.Properties.ProvisionedThroughput.WriteCapacityUnits;
  }
  expect(read).toBeLessThanOrEqual(25);
  expect(write).toBeLessThanOrEqual(25);
});

test('Lambda は同時実行数の上限10、ログは1週間で削除可能', () => {
  template.hasResourceProperties('AWS::Lambda::Function', { ReservedConcurrentExecutions: 10 });
  template.hasResource('AWS::Logs::LogGroup', {
    Properties: { RetentionInDays: 7 },
    DeletionPolicy: 'Delete',
  });
});

test('関数URLは AWS_IAM 認証', () => {
  template.hasResourceProperties('AWS::Lambda::Url', { AuthType: 'AWS_IAM' });
});

test('Cognito のアプリクライアントはシークレットなし、ユーザープールは削除可能', () => {
  template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
    GenerateSecret: false,
  });
  template.hasResource('AWS::Cognito::UserPool', { DeletionPolicy: 'Delete' });
});

test('Cognito のログイン方式は SRP と（テスト用の）管理者ログインだけ。パスワードを直接送る方式はなし', () => {
  const clients = Object.values(template.findResources('AWS::Cognito::UserPoolClient'));
  expect(clients).toHaveLength(1);
  const flows: string[] = clients[0].Properties.ExplicitAuthFlows;
  expect(flows).toEqual(
    expect.arrayContaining(['ALLOW_USER_SRP_AUTH', 'ALLOW_ADMIN_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']),
  );
  expect(flows).not.toContain('ALLOW_USER_PASSWORD_AUTH');
});

test('Worker 用 IAM ユーザーは関数URLの呼び出しだけ。アクセスキーは作らない', () => {
  template.resourceCountIs('AWS::IAM::User', 1);
  template.resourceCountIs('AWS::IAM::AccessKey', 0);
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({ Action: 'lambda:InvokeFunctionUrl', Effect: 'Allow' }),
      ]),
    },
    Users: Match.anyValue(),
  });
});

test('Worker 用 IAM ユーザーの InvokeFunction は関数URL経由のときだけ（条件付き）', () => {
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: 'lambda:InvokeFunction',
          Effect: 'Allow',
          Condition: { Bool: { 'lambda:InvokedViaFunctionUrl': 'true' } },
        }),
      ]),
    },
    Users: Match.anyValue(),
  });
  // 条件なしの InvokeFunction（関数を直接呼べる権限）がないこと
  const policies = Object.values(template.findResources('AWS::IAM::Policy'));
  for (const p of policies) {
    for (const s of p.Properties.PolicyDocument.Statement) {
      const actions = [s.Action].flat();
      if (actions.includes('lambda:InvokeFunction')) {
        expect(s.Condition).toEqual({ Bool: { 'lambda:InvokedViaFunctionUrl': 'true' } });
      }
    }
  }
});

test('Lambda に Cognito の ID とテーブル名を環境変数で渡す', () => {
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        USER_POOL_ID: Match.anyValue(),
        USER_POOL_CLIENT_ID: Match.anyValue(),
        USERS_TABLE_NAME: Match.anyValue(),
        PINS_TABLE_NAME: Match.anyValue(),
        RANKINGS_TABLE_NAME: Match.anyValue(),
        COMMENTS_TABLE_NAME: Match.anyValue(),
        REACTIONS_TABLE_NAME: Match.anyValue(),
      },
    },
  });
});

test('Lambda の DynamoDB 権限は、テーブルごとに必要な操作だけ（Scan・ワイルドカードなし）', () => {
  const tableIds = Object.keys(template.findResources('AWS::DynamoDB::Table'));
  const idOf = (name: string) => tableIds.find((id) => id.startsWith(`${name}Table`));
  const dynamoStatements = Object.values(template.findResources('AWS::IAM::Policy'))
    .flatMap((p) => p.Properties.PolicyDocument.Statement)
    .filter((s) => [s.Action].flat().some((a: string) => a.startsWith('dynamodb:')));

  // テーブル → 許可した操作
  const granted: Record<string, string[]> = {};
  for (const s of dynamoStatements) {
    const resources = [s.Resource].flat();
    expect(resources).toHaveLength(1); // 1つの文で1つのテーブルだけ
    const id = resources[0]['Fn::GetAtt']?.[0];
    expect(id).toBeDefined(); // '*' や文字列の ARN ではない
    granted[id] = [...(granted[id] ?? []), ...[s.Action].flat()].sort();
  }
  expect(granted).toEqual({
    [idOf('Users')!]: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
    [idOf('Pins')!]: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query', 'dynamodb:UpdateItem'],
    [idOf('Comments')!]: ['dynamodb:PutItem', 'dynamodb:Query'],
    // DeleteItem はスタンプの取り消しだけに使う
    [idOf('Reactions')!]: ['dynamodb:DeleteItem', 'dynamodb:GetItem', 'dynamodb:PutItem'],
    [idOf('Rankings')!]: ['dynamodb:Query', 'dynamodb:UpdateItem'],
  });
});
