import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib/core';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

// DynamoDB のテーブル定義（docs/db-schema.md の「2. テーブル一覧」どおり）。
// 全テーブルの合計を 読み・書き 各25ユニット以内にする（無料枠）。今は 書き14／読み23。
const TABLES = [
  { id: 'Users', pk: 'userId', sk: undefined, write: 2, read: 3 },
  { id: 'Pins', pk: 'cell', sk: 'sk', write: 3, read: 10 },
  { id: 'Comments', pk: 'pinId', sk: 'sk', write: 2, read: 3 },
  { id: 'Reactions', pk: 'pinId', sk: 'sk', write: 2, read: 3 },
  { id: 'Rankings', pk: 'pk', sk: 'key', write: 5, read: 4 },
] as const;

export class MugStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---- DynamoDB（プロビジョンド。Auto Scaling・PITR・Streams は使わない） ----
    const tables: Record<string, dynamodb.Table> = {};
    for (const t of TABLES) {
      tables[t.id] = new dynamodb.Table(this, `${t.id}Table`, {
        partitionKey: { name: t.pk, type: dynamodb.AttributeType.STRING },
        sortKey: t.sk ? { name: t.sk, type: dynamodb.AttributeType.STRING } : undefined,
        billingMode: dynamodb.BillingMode.PROVISIONED,
        readCapacity: t.read,
        writeCapacity: t.write,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // ---- Cognito（ログイン） ----
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true, // 利用者が自分で登録できる
      signInAliases: { email: true }, // メールアドレスでログイン
      autoVerify: { email: true }, // 登録時にメールで確認コードを送る
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const userPoolClient = userPool.addClient('WebClient', {
      generateSecret: false, // ブラウザから使うのでクライアントシークレットなし
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
    });

    // ---- Lambda（API） ----
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiFunction = new nodejs.NodejsFunction(this, 'ApiFunction', {
      entry: path.join(__dirname, '../lambda/api/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      reservedConcurrentExecutions: 2, // 同時実行数の上限（ループなどで大量に動かないように）
      logGroup: apiLogGroup,
      environment: {
        // IDトークンの検証に使う（秘密ではない）
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USERS_TABLE_NAME: tables.Users.tableName,
      },
    });

    // Users テーブルの読み書きだけを許可する（Scan や他のテーブルは許可しない）。
    // 他のテーブルは、そのAPIを作るときに必要な操作だけを足す。
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
        resources: [tables.Users.tableArn],
      }),
    );

    // 関数URL。AWS_IAM なので、Worker の署名がない呼び出しは AWS の手前で 403 になる
    const functionUrl = apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    // ---- Worker 用の IAM ユーザー（アクセスキーはここでは作らない） ----
    const workerUser = new iam.User(this, 'WorkerUser');
    workerUser.addToPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunctionUrl'],
        resources: [apiFunction.functionArn],
        conditions: { StringEquals: { 'lambda:FunctionUrlAuthType': 'AWS_IAM' } },
      }),
    );
    // 2025年10月以降の関数URLは InvokeFunction も必要。関数URL経由の呼び出しに限って許可する
    workerUser.addToPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [apiFunction.functionArn],
        conditions: { Bool: { 'lambda:InvokedViaFunctionUrl': 'true' } },
      }),
    );

    // ---- 出力（デプロイ後に画面に表示される。秘密情報ではない） ----
    new cdk.CfnOutput(this, 'FunctionUrl', { value: functionUrl.url });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
