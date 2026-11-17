import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { PinKey } from './pin-id';

// Reactions テーブル（docs/db-schema.md）の読み書き。
// 押す・取り消すときは、Reactions と Pins の件数（reactions）を「トランザクション」でまとめて書く。
// どちらか一方だけが書かれることがないので、二重に押しても件数がずれない（docs/adr/feature-api-social.md）。

export type ReactionItem = {
  pinId: string; // ピンの ULID
  sk: string; // 種類#userId（1人1種類1回にするため）
  type: string;
  userId: string;
  nickname: string;
  createdAt: string;
};

export type AddResult = 'added' | 'already' | 'no-pin';
export type RemoveResult = 'removed' | 'absent' | 'no-pin';

export type ReactionsRepo = {
  // 押す。もう押していれば 'already'（何も書かない）、ピンがなければ 'no-pin'
  add(key: PinKey, item: Omit<ReactionItem, 'pinId' | 'sk'>): Promise<AddResult>;
  // 取り消す。押していなければ 'absent'（何も書かない）、ピンがなければ 'no-pin'
  remove(key: PinKey, type: string, userId: string): Promise<RemoveResult>;
  // その人がその種類を押しているか
  has(pinId: string, type: string, userId: string): Promise<boolean>;
};

export function reactionSk(type: string, userId: string): string {
  return `${type}#${userId}`;
}

// トランザクションが条件に合わずに取り消されたとき、どの書き込みの条件に合わなかったか（並び順どおり）
function cancelledCodes(e: unknown): string[] | undefined {
  if (!(e instanceof Error) || e.name !== 'TransactionCanceledException') return undefined;
  const reasons = (e as Error & { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
  return reasons.map((r) => r.Code ?? 'None');
}

export function createDynamoReactionsRepo(reactionsTable: string, pinsTable: string): ReactionsRepo {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  // Pins の reactions.<種類> を delta だけ増減する書き込み（ピンがあるときだけ）。
  // 件数の項目がまだなければ 0 として計算する
  const pinUpdate = (key: PinKey, type: string, delta: 1 | -1) => ({
    Update: {
      TableName: pinsTable,
      Key: { cell: key.cell, sk: key.sk },
      UpdateExpression:
        delta === 1
          ? 'SET reactions.#t = if_not_exists(reactions.#t, :zero) + :one'
          : 'SET reactions.#t = if_not_exists(reactions.#t, :one) - :one',
      ConditionExpression: 'attribute_exists(pinId)',
      ExpressionAttributeNames: { '#t': type },
      ExpressionAttributeValues: delta === 1 ? { ':zero': 0, ':one': 1 } : { ':one': 1 },
    },
  });

  return {
    async add(key, item) {
      try {
        await db.send(
          new TransactWriteCommand({
            TransactItems: [
              pinUpdate(key, item.type, 1),
              {
                Put: {
                  TableName: reactionsTable,
                  Item: { pinId: key.pinId, sk: reactionSk(item.type, item.userId), ...item },
                  ConditionExpression: 'attribute_not_exists(sk)', // もう押していたら書かない
                },
              },
            ],
          }),
        );
        return 'added';
      } catch (e) {
        const codes = cancelledCodes(e);
        if (!codes) throw e;
        if (codes[0] === 'ConditionalCheckFailed') return 'no-pin';
        if (codes[1] === 'ConditionalCheckFailed') return 'already';
        throw e;
      }
    },
    async remove(key, type, userId) {
      try {
        await db.send(
          new TransactWriteCommand({
            TransactItems: [
              pinUpdate(key, type, -1),
              {
                Delete: {
                  TableName: reactionsTable,
                  Key: { pinId: key.pinId, sk: reactionSk(type, userId) },
                  ConditionExpression: 'attribute_exists(sk)', // 押していなければ消さない（件数も減らさない）
                },
              },
            ],
          }),
        );
        return 'removed';
      } catch (e) {
        const codes = cancelledCodes(e);
        if (!codes) throw e;
        if (codes[0] === 'ConditionalCheckFailed') return 'no-pin';
        if (codes[1] === 'ConditionalCheckFailed') return 'absent';
        throw e;
      }
    },
    async has(pinId, type, userId) {
      const res = await db.send(
        new GetCommand({
          TableName: reactionsTable,
          Key: { pinId, sk: reactionSk(type, userId) },
          ProjectionExpression: 'sk',
        }),
      );
      return res.Item !== undefined;
    },
  };
}
