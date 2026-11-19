import { DeleteCommand, type DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

// 1つのパーティション（例：あるピンのコメント全部）を消す部品。Comments・Reactions で使う。
// Scan は使わない。キー（パーティションキーと sk）だけを Query で読み、DeleteItem で1件ずつ消す。
// BatchWriteItem を使わないのは、取りこぼし（UnprocessedItems）を自分でやり直す処理が要らないため。
// 書き込みのユニットが小さいので、まとめて送っても速さは変わらない（docs/adr/feature-api-pins-edit.md）。
// 1件ずつなら、混んで断られたときは SDK が自動で待ってやり直す（回数は DELETE_MAX_ATTEMPTS）。

export const DELETE_MAX_ATTEMPTS = 5; // SDK の初期値は 3
const PAGE = 100;

// deleted：消した件数。stopped：時間切れで途中でやめたか（残りがあるかもしれない）
export type DeleteAllResult = { deleted: number; stopped: boolean };

export async function deletePartition(
  db: DynamoDBDocumentClient,
  tableName: string,
  keyName: string,
  keyValue: string,
  shouldStop: () => boolean,
): Promise<DeleteAllResult> {
  let deleted = 0;
  let start: Record<string, unknown> | undefined;
  // ページごとに「続き」から読む（先頭から読み直すと、消した直後のものがまだ見えて二重に消すことがあるため）
  do {
    const res = await db.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': keyName, '#sk': 'sk' },
        ExpressionAttributeValues: { ':pk': keyValue },
        ProjectionExpression: '#pk, #sk',
        Limit: PAGE,
        ExclusiveStartKey: start,
      }),
    );
    for (const item of res.Items ?? []) {
      if (shouldStop()) return { deleted, stopped: true };
      await db.send(new DeleteCommand({ TableName: tableName, Key: { [keyName]: keyValue, sk: item.sk } }));
      deleted++;
    }
    start = res.LastEvaluatedKey;
  } while (start);
  return { deleted, stopped: false };
}
