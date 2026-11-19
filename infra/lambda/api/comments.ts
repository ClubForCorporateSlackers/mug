import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DELETE_MAX_ATTEMPTS, deletePartition, type DeleteAllResult } from './partition';

// Comments テーブル（docs/db-schema.md）の読み書き。

export type CommentItem = {
  pinId: string; // ピンの ULID（APIの pinId から cell を除いたもの）
  sk: string; // 日時#commentId（古い順に並べるため）
  commentId: string;
  userId: string; // APIでは返さない
  nickname: string; // 投稿時点のニックネーム（あとで変えても、このコメントの名前は変わらない）
  text: string;
  createdAt: string;
};

// 一覧で返すために読む項目（userId は読まない）
export type CommentSummary = Pick<CommentItem, 'commentId' | 'nickname' | 'text' | 'createdAt'>;

export type CommentsRepo = {
  put(item: CommentItem): Promise<void>;
  // 古い順に最大 limit 件
  list(pinId: string, limit: number): Promise<CommentSummary[]>;
  // そのピンのコメントを全部消す（ピンを消したとき）。shouldStop が true を返したら、途中でやめる
  deleteAll(pinId: string, shouldStop: () => boolean): Promise<DeleteAllResult>;
};

const SUMMARY_FIELDS = ['commentId', 'nickname', 'text', 'createdAt'];

export function createDynamoCommentsRepo(tableName: string): CommentsRepo {
  // 書き込みが混んで断られたときの、SDK の自動のやり直しの回数を少し増やす（消すときに1件ずつ書くため）
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({ maxAttempts: DELETE_MAX_ATTEMPTS }));
  return {
    async put(item) {
      await db.send(new PutCommand({ TableName: tableName, Item: item }));
    },
    async list(pinId, limit) {
      const res = await db.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#pinId = :pinId',
          ExpressionAttributeNames: {
            '#pinId': 'pinId',
            ...Object.fromEntries(SUMMARY_FIELDS.map((f) => [`#${f}`, f])),
          },
          ExpressionAttributeValues: { ':pinId': pinId },
          ProjectionExpression: SUMMARY_FIELDS.map((f) => `#${f}`).join(', '),
          ScanIndexForward: true, // 古い順
          Limit: limit,
        }),
      );
      return (res.Items ?? []) as CommentSummary[];
    },
    async deleteAll(pinId, shouldStop) {
      return deletePartition(db, tableName, 'pinId', pinId, shouldStop);
    },
  };
}
