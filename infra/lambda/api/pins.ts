import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Pins・Rankings テーブル（docs/db-schema.md）の読み書き。

export type PinItem = {
  cell: string; // ずらした位置の geohash
  sk: string; // 日時#pinId（新しい順に並べるため）
  pinId: string;
  lat: number; // ずらした後の緯度
  lng: number; // ずらした後の経度
  city: string;
  cityCode: string | null;
  stamp: string | null;
  memo: string;
  userId: string; // ランキング用。APIでは返さない
  commentCount: number;
  reactions: Record<string, number>;
  createdAt: string;
};

// 地図に返すために読む項目（userId・cityCode は読まない）
export type PinSummary = Omit<PinItem, 'cell' | 'userId' | 'cityCode'>;

export type PinsRepo = {
  put(item: PinItem): Promise<void>;
  // 1つの cell を新しい順に最大 limit 件。hasMore は、まだ古いものが残っているか
  queryCell(cell: string, limit: number): Promise<{ items: PinSummary[]; hasMore: boolean }>;
};

export type RankingKind = 'user' | 'city' | 'blood';
export type RankingsRepo = {
  // その月の件数を1増やす（なければ1から）。label は最新の表示名で上書きする
  increment(month: string, kind: RankingKind, key: string, label: string): Promise<void>;
};

// 読む項目。予約語とぶつからないよう、すべて #名前 で指定する
const SUMMARY_FIELDS = ['sk', 'pinId', 'lat', 'lng', 'city', 'stamp', 'memo', 'commentCount', 'reactions', 'createdAt'];

function docClient() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export function createDynamoPinsRepo(tableName: string): PinsRepo {
  const db = docClient();
  return {
    async put(item) {
      await db.send(new PutCommand({ TableName: tableName, Item: item }));
    },
    async queryCell(cell, limit) {
      const res = await db.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#cell = :cell',
          ExpressionAttributeNames: {
            '#cell': 'cell',
            ...Object.fromEntries(SUMMARY_FIELDS.map((f) => [`#${f}`, f])),
          },
          ExpressionAttributeValues: { ':cell': cell },
          ProjectionExpression: SUMMARY_FIELDS.map((f) => `#${f}`).join(', '),
          ScanIndexForward: false, // 新しい順
          Limit: limit,
        }),
      );
      return { items: (res.Items ?? []) as PinSummary[], hasMore: res.LastEvaluatedKey !== undefined };
    },
  };
}

export function createDynamoRankingsRepo(tableName: string): RankingsRepo {
  const db = docClient();
  return {
    async increment(month, kind, key, label) {
      await db.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: `${month}#${kind}`, key },
          UpdateExpression: 'SET #label = :label ADD #count :one',
          ExpressionAttributeNames: { '#label': 'label', '#count': 'count' },
          ExpressionAttributeValues: { ':label': label, ':one': 1 },
        }),
      );
    },
  };
}
