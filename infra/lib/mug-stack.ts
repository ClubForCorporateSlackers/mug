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
// 全テーブルと索引（GSI）の合計を 読み・書き 各25ユニット以内にする（無料枠）。
// 今は テーブル 書き14／読み23 ＋ 索引 byUser 書き3／読み2 ＝ 書き17／読み25（読みは余りなし。decisions.md #36）。
const TABLES = [
  { id: 'Users', pk: 'userId', sk: undefined, write: 2, read: 3 },
  { id: 'Pins', pk: 'cell', sk: 'sk', write: 3, read: 10 },
  { id: 'Comments', pk: 'pinId', sk: 'sk', write: 2, read: 3 },
  { id: 'Reactions', pk: 'pinId', sk: 'sk', write: 2, read: 3 },
  { id: 'Rankings', pk: 'pk', sk: 'key', write: 5, read: 4 },
] as const;

// Pins の索引：userId ごとに新しい順（sk）で引く（GET /api/me/pins）。
// 書きは Pins と同じ3（索引の書きが足りないと、Pins 本体への書き込みも止められるため）。
// 入れる項目は ALL（あとから変えられないため。docs/adr/feature-api-my-pins.md）
export const PINS_USER_INDEX = { name: 'byUser', pk: 'userId', sk: 'sk', write: 3, read: 2 } as const;

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
    tables.Pins.addGlobalSecondaryIndex({
      indexName: PINS_USER_INDEX.name,
      partitionKey: { name: PINS_USER_INDEX.pk, type: dynamodb.AttributeType.STRING },
      sortKey: { name: PINS_USER_INDEX.sk, type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
      readCapacity: PINS_USER_INDEX.read,
      writeCapacity: PINS_USER_INDEX.write,
    });

    // ---- Cognito（ログイン） ----
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true, // 利用者が自分で登録できる
      signInAliases: { email: true }, // メールアドレスでログイン
      autoVerify: { email: true }, // 登録時にメールで確認コードを送る
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const userPoolClient = userPool.addClient('WebClient', {
      generateSecret: false, // ブラウザから使うのでクライアントシークレットなし
      authFlows: {
        userSrp: true, // 画面からのログイン（パスワードをそのまま送らない方式）
        // テスト用・ダミーデータの投入用（scripts/seed/）：AWSの管理者の認証情報で admin-initiate-auth を使い、IDトークンを取る。
        // 使えるのは管理者の権限がある人だけで、ブラウザからは使えない。外さない（ハッカソン後の cdk destroy で一緒に消える）
        // （docs/adr/feature-api-me.md）
        adminUserPassword: true,
      },
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
      reservedConcurrentExecutions: 10, // 同時実行数の上限（ループなどで大量に動かないように。docs/decisions.md #31）
      logGroup: apiLogGroup,
      environment: {
        // IDトークンの検証に使う（秘密ではない）
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USERS_TABLE_NAME: tables.Users.tableName,
        PINS_TABLE_NAME: tables.Pins.tableName,
        PINS_USER_INDEX_NAME: PINS_USER_INDEX.name,
        RANKINGS_TABLE_NAME: tables.Rankings.tableName,
        COMMENTS_TABLE_NAME: tables.Comments.tableName,
        REACTIONS_TABLE_NAME: tables.Reactions.tableName,
      },
    });

    // DynamoDB の権限は、テーブルごとに使う操作だけを許可する（Scan・Delete などは許可しない）。
    // トランザクション（TransactWriteItems）は専用の権限がなく、中の書き込みごとの権限（PutItem など）で許可される。
    // Users：プロフィールの取得・登録、pinCount を増やす
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
        resources: [tables.Users.tableArn],
      }),
    );
    // Pins：ピンの保存（PutItem）、地図の範囲の取得（Query）、
    // ピンがあるかの確認とスタンプの件数の読み出し（GetItem）、commentCount・reactions の増減と自分のピンの変更（UpdateItem）、
    // 自分のピンの削除（DeleteItem）
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
        resources: [tables.Pins.tableArn],
      }),
    );
    // Pins の索引 byUser：自分のピンの一覧（Query だけ。この索引に限る）
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [`${tables.Pins.tableArn}/index/${PINS_USER_INDEX.name}`],
      }),
    );
    // Comments：コメントの保存（PutItem）と一覧（Query）、ピンを消したときにそのピンのコメントを消す（DeleteItem）
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:Query', 'dynamodb:DeleteItem'],
        resources: [tables.Comments.tableArn],
      }),
    );
    // Reactions：押す（PutItem）、取り消す（DeleteItem）、自分が押したかの確認（GetItem）、
    // ピンを消したときにそのピンのスタンプを探す（Query）
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:GetItem', 'dynamodb:Query'],
        resources: [tables.Reactions.tableArn],
      }),
    );
    // Rankings：件数を増やす（UpdateItem の ADD）と、ランキングの取得（Query）
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:UpdateItem', 'dynamodb:Query'],
        resources: [tables.Rankings.tableArn],
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
