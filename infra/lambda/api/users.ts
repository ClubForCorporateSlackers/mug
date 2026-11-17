import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Users テーブル（docs/db-schema.md）の読み書き。
export type UserItem = {
  userId: string;
  nickname: string;
  bloodType: string;
  createdAt: string;
  updatedAt: string;
  pinCount?: number; // ピンの投稿（POST /api/pins）を作るときに増やす予定。今はまだない
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
    // createdAt は初回だけ入れる（if_not_exists）。pinCount など他の項目は消さない（Put ではなく Update）。
    async saveProfile(userId, nickname, bloodType, now) {
      const res = await db.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId },
          UpdateExpression:
            'SET nickname = :n, bloodType = :b, updatedAt = :now, createdAt = if_not_exists(createdAt, :now)',
          ExpressionAttributeValues: { ':n': nickname, ':b': bloodType, ':now': now },
          ReturnValues: 'ALL_NEW',
        }),
      );
      return res.Attributes as UserItem;
    },
  };
}
