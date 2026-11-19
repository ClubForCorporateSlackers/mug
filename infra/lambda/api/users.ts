import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Users テーブル（docs/db-schema.md）の読み書き。
export type UserItem = {
  userId: string;
  nickname: string;
  bloodType: string;
  createdAt: string;
  updatedAt: string;
  // 立てたピンの数。プロフィール登録のときに 0 を入れ、ピンの投稿（4-2）で ADD pinCount 1 する。
  // この項目ができる前に登録した人には、まだない（ない場合は 0 として扱う）
  pinCount?: number;
};

export type UsersRepo = {
  get(userId: string): Promise<UserItem | undefined>;
  saveProfile(userId: string, nickname: string, bloodType: string, now: string): Promise<UserItem>;
  // ピンを立てたときに pinCount を1増やす（ADD はない項目にも使える）
  incrementPinCount(userId: string): Promise<void>;
  // ピンを消したときに pinCount を1減らす。0 以下・項目がない・未登録のときは何もしない
  decrementPinCount(userId: string): Promise<void>;
};

export function createDynamoUsersRepo(tableName: string): UsersRepo {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  return {
    async get(userId) {
      const res = await db.send(new GetCommand({ TableName: tableName, Key: { userId } }));
      return res.Item as UserItem | undefined;
    },
    // 1回の書き込みで「登録」と「変更」の両方に対応する。
    // createdAt と pinCount は、まだないときだけ入れる（if_not_exists）。
    // 変更のときに pinCount を 0 に戻さないよう、Put ではなく Update を使う。
    async saveProfile(userId, nickname, bloodType, now) {
      const res = await db.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId },
          UpdateExpression:
            'SET nickname = :n, bloodType = :b, updatedAt = :now, ' +
            'createdAt = if_not_exists(createdAt, :now), pinCount = if_not_exists(pinCount, :zero)',
          ExpressionAttributeValues: { ':n': nickname, ':b': bloodType, ':now': now, ':zero': 0 },
          ReturnValues: 'ALL_NEW',
        }),
      );
      return res.Attributes as UserItem;
    },
    // 登録済みの人だけ増やす（条件付き）。未登録の人の項目を作ってしまわないため
    async incrementPinCount(userId) {
      await db.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId },
          UpdateExpression: 'ADD pinCount :one',
          ConditionExpression: 'attribute_exists(userId)',
          ExpressionAttributeValues: { ':one': 1 },
        }),
      );
    },
    async decrementPinCount(userId) {
      try {
        await db.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { userId },
            UpdateExpression: 'ADD pinCount :neg',
            ConditionExpression: 'attribute_exists(userId) AND pinCount > :zero', // マイナスにしない
            ExpressionAttributeValues: { ':neg': -1, ':zero': 0 },
          }),
        );
      } catch (e) {
        if (!(e instanceof Error && e.name === 'ConditionalCheckFailedException')) throw e;
      }
    },
  };
}
