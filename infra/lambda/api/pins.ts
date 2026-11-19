import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
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

// PATCH で変えられる項目（送った項目だけ）。位置を変えるときは、ずらした後の位置と市町村を入れる
export type PinChanges = Partial<Pick<PinItem, 'stamp' | 'memo' | 'lat' | 'lng' | 'city' | 'cityCode'>>;

// 自分のピンだけを書き換える・消す処理の結果。
// old は書き換える前（消す前）の中身。同時に別の操作があっても、実際に書き換えた相手の中身になる
export type OwnedResult = { kind: 'ok'; old: PinItem } | { kind: 'not-found' } | { kind: 'not-owner' };

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
  // 自分（userId）のピンなら changes の項目だけ書き換える。ほかの人のピン・ないピンには何も書かない
  updateOwned(key: PinKey, userId: string, changes: PinChanges): Promise<OwnedResult>;
  // 自分（userId）のピンなら消す。ほかの人のピン・ないピンは消さない
  deleteOwned(key: PinKey, userId: string): Promise<OwnedResult>;
};

export type RankingKind = 'user' | 'city' | 'blood';
export type RankingEntry = { key: string; label: string; count: number };
export type RankingsRepo = {
  // その月の件数を1増やす（なければ1から）。label は最新の表示名で上書きする
  increment(month: string, kind: RankingKind, key: string, label: string): Promise<void>;
  // その月・種類の件数を最大 limit 件読む（並びは key 順。件数の順に並べるのは呼ぶ側）
  list(month: string, kind: RankingKind, limit: number): Promise<RankingEntry[]>;
  // その月の件数を1減らす。行がないときと、0件のときは何もしない（マイナスにしない）。
  // 0件になった行は消さずに残す（ランキングの表示で 0件は出さないため）
  decrement(month: string, kind: RankingKind, key: string): Promise<void>;
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

// 条件付きの書き込みが条件に合わなかったとき、ReturnValuesOnConditionCheckFailure で今の中身が付いてくる。
// 条件は「ピンがあり、userId が自分」なので、中身があれば「ほかの人のピン」、なければ「ピンがない」
function ownedFailure(e: unknown): OwnedResult | undefined {
  if (!isConditionFailed(e)) return undefined;
  return (e as { Item?: unknown }).Item ? { kind: 'not-owner' } : { kind: 'not-found' };
}

const OWNER_CONDITION = 'attribute_exists(pinId) AND userId = :uid';

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
    async updateOwned(key, userId, changes) {
      const fields = Object.entries(changes).filter(([, v]) => v !== undefined);
      try {
        const res = await db.send(
          new UpdateCommand({
            TableName: tableName,
            Key: pinKey(key),
            UpdateExpression: `SET ${fields.map(([f]) => `#${f} = :${f}`).join(', ')}`,
            ConditionExpression: OWNER_CONDITION,
            ExpressionAttributeNames: Object.fromEntries(fields.map(([f]) => [`#${f}`, f])),
            ExpressionAttributeValues: { ':uid': userId, ...Object.fromEntries(fields.map(([f, v]) => [`:${f}`, v])) },
            ReturnValues: 'ALL_OLD', // 書き換える前の中身（市町村が変わったかを、確実に知るため）
            ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
          }),
        );
        return { kind: 'ok', old: res.Attributes as PinItem };
      } catch (e) {
        const failure = ownedFailure(e);
        if (failure) return failure;
        throw e;
      }
    },
    async deleteOwned(key, userId) {
      try {
        const res = await db.send(
          new DeleteCommand({
            TableName: tableName,
            Key: pinKey(key),
            ConditionExpression: OWNER_CONDITION,
            ExpressionAttributeValues: { ':uid': userId },
            ReturnValues: 'ALL_OLD', // 消したピンの中身（件数を減らすのに使う）
            ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
          }),
        );
        return { kind: 'ok', old: res.Attributes as PinItem };
      } catch (e) {
        const failure = ownedFailure(e);
        if (failure) return failure;
        throw e;
      }
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
    async decrement(month, kind, key) {
      try {
        await db.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: `${month}#${kind}`, key },
            UpdateExpression: 'ADD #count :neg',
            // 行がないときにマイナスの行を作らない。0件のときは減らさない
            ConditionExpression: 'attribute_exists(pk) AND #count > :zero',
            ExpressionAttributeNames: { '#count': 'count' },
            ExpressionAttributeValues: { ':neg': -1, ':zero': 0 },
          }),
        );
      } catch (e) {
        if (!isConditionFailed(e)) throw e;
      }
    },
  };
}
