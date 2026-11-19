import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { PinKey } from './pin-id';

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
  // 立てたときの血液型。消すときにこの血液型の件数を減らす。APIでは返さない。
  // この項目ができる前（2026-11-19 より前）に立てたピンにはない
  bloodType?: string;
  commentCount: number;
  reactions: Record<string, number>;
  createdAt: string;
};

// 地図に返すために読む項目（userId・cityCode・bloodType は読まない）。cell はAPIの pinId を作るのに使う
export type PinSummary = Omit<PinItem, 'userId' | 'cityCode' | 'bloodType'>;

export type PinsRepo = {
  put(item: PinItem): Promise<void>;
  // 1つの cell を新しい順に最大 limit 件。hasMore は、まだ古いものが残っているか
  queryCell(cell: string, limit: number): Promise<{ items: PinSummary[]; hasMore: boolean }>;
  // ピンがあるか（コメント一覧の 404 用）
  exists(key: PinKey): Promise<boolean>;
  // commentCount を1増やす。ピンがなければ false（何も書かない）
  incrementCommentCount(key: PinKey): Promise<boolean>;
  // スタンプの件数（書いた直後の値を読む）。ピンがなければ undefined
  getReactions(key: PinKey): Promise<Record<string, number> | undefined>;
};

export type RankingKind = 'user' | 'city' | 'blood';
export type RankingEntry = { key: string; label: string; count: number };
export type RankingsRepo = {
  // その月の件数を1増やす（なければ1から）。label は最新の表示名で上書きする
  increment(month: string, kind: RankingKind, key: string, label: string): Promise<void>;
  // その月・種類の件数を最大 limit 件読む（並びは key 順。件数の順に並べるのは呼ぶ側）
  list(month: string, kind: RankingKind, limit: number): Promise<RankingEntry[]>;
};

// 読む項目。予約語とぶつからないよう、すべて #名前 で指定する
const SUMMARY_FIELDS = ['cell', 'sk', 'pinId', 'lat', 'lng', 'city', 'stamp', 'memo', 'commentCount', 'reactions', 'createdAt'];

// 条件付きの書き込みで、条件に合わなかったときのエラーか
export function isConditionFailed(e: unknown): boolean {
  return e instanceof Error && e.name === 'ConditionalCheckFailedException';
}

function pinKey(key: PinKey) {
  return { cell: key.cell, sk: key.sk };
}

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
    async exists(key) {
      const res = await db.send(
        new GetCommand({ TableName: tableName, Key: pinKey(key), ProjectionExpression: 'pinId' }),
      );
      return res.Item !== undefined;
    },
    async incrementCommentCount(key) {
      try {
        await db.send(
          new UpdateCommand({
            TableName: tableName,
            Key: pinKey(key),
            UpdateExpression: 'ADD commentCount :one',
            // ピンがないときに項目を作ってしまわないよう、あるときだけ増やす
            ConditionExpression: 'attribute_exists(pinId)',
            ExpressionAttributeValues: { ':one': 1 },
          }),
        );
        return true;
      } catch (e) {
        if (isConditionFailed(e)) return false;
        throw e;
      }
    },
    async getReactions(key) {
      const res = await db.send(
        new GetCommand({
          TableName: tableName,
          Key: pinKey(key),
          ProjectionExpression: 'pinId, reactions',
          ConsistentRead: true, // スタンプを押した直後の件数を返すため（読み込みは1件で1ユニット）
        }),
      );
      if (!res.Item) return undefined;
      return (res.Item.reactions ?? {}) as Record<string, number>;
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
    async list(month, kind, limit) {
      const res = await db.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'pk', '#key': 'key', '#label': 'label', '#count': 'count' },
          ExpressionAttributeValues: { ':pk': `${month}#${kind}` },
          ProjectionExpression: '#key, #label, #count',
          Limit: limit,
        }),
      );
      return (res.Items ?? []) as RankingEntry[];
    },
  };
}
