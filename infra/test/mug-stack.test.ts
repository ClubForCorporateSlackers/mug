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

test('Lambda は同時実行数の上限2、ログは1週間で削除可能', () => {
  template.hasResourceProperties('AWS::Lambda::Function', { ReservedConcurrentExecutions: 2 });
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

test('Lambda に Cognito の ID と Users テーブル名を環境変数で渡す', () => {
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        USER_POOL_ID: Match.anyValue(),
        USER_POOL_CLIENT_ID: Match.anyValue(),
        USERS_TABLE_NAME: Match.anyValue(),
      },
    },
  });
});

test('Lambda の DynamoDB 権限は Users テーブルの GetItem と UpdateItem だけ（Scan なし）', () => {
  const usersTableId = Object.keys(template.findResources('AWS::DynamoDB::Table')).find((id) =>
    id.startsWith('UsersTable'),
  );
  const dynamoStatements = Object.values(template.findResources('AWS::IAM::Policy'))
    .flatMap((p) => p.Properties.PolicyDocument.Statement)
    .filter((s) => [s.Action].flat().some((a: string) => a.startsWith('dynamodb:')));
  expect(dynamoStatements).toHaveLength(1);
  expect([dynamoStatements[0].Action].flat().sort()).toEqual(['dynamodb:GetItem', 'dynamodb:UpdateItem']);
  expect(dynamoStatements[0].Resource).toEqual({ 'Fn::GetAtt': [usersTableId, 'Arn'] });
});
