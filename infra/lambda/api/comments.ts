import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

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
};

const SUMMARY_FIELDS = ['commentId', 'nickname', 'text', 'createdAt'];

export function createDynamoCommentsRepo(tableName: string): CommentsRepo {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
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
  };
}
