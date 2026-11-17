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
  };
}
