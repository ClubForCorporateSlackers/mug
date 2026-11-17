// ダミーのデータを片付ける（scripts/seed/README.md、docs/adr/feature-seed-data.md の案1）。
// APIにはピンを消す機能がないので、管理者の認証情報で DynamoDB と Cognito を直接操作する。
// Scan は使わない（GetItem と Query だけ）。消すのは「ダミーのユーザー（seed-…@example.com）のもの」だけ。
//
//   npm run cleanup               … 何を消すかを表示するだけ（何も消さない）
//   npm run cleanup -- --execute  … 実際に消す

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { loadStack, pacer } from './lib/aws.ts';
import { deleteUser, listSeedUsers } from './lib/cognito.ts';
import { boundsOf, cellsForBounds, nowJst, pinKeyFromPublicId } from './lib/geo.ts';
import { archiveState, readState, STATE_PATH } from './lib/state.ts';
import { config } from './seed.config.ts';

const execute = process.argv.includes('--execute');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

type PinRow = { cell: string; sk: string; pinId: string; userId: string; cityCode?: string | null; createdAt: string };

// 1つのパーティションの中身を全部読む（Query を Limit 付きでページごとに）
async function queryAll(table: string, keyName: string, keyValue: string, projection: string, names: Record<string, string>) {
  const items: Record<string, unknown>[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const res = await db.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': keyName, ...names },
        ExpressionAttributeValues: { ':pk': keyValue },
        ProjectionExpression: projection,
        Limit: 100,
        ExclusiveStartKey: start,
      }),
    );
    items.push(...(res.Items ?? []));
    start = res.LastEvaluatedKey;
  } while (start);
  return items;
}

// ランキングの件数を1減らし、0以下になったら行を消す
async function decrement(table: string, key: { pk: string; key: string }, pace: () => Promise<void>) {
  const isCondFailed = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';
  try {
    const r = await db.send(
      new UpdateCommand({
        TableName: table,
        Key: key,
        UpdateExpression: 'ADD #count :neg',
        ConditionExpression: 'attribute_exists(pk)', // 行がないときに、マイナスの行を作らない
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: { ':neg': -1 },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    if (((r.Attributes?.count as number | undefined) ?? 0) > 0) return;
    await pace();
    await db.send(
      new DeleteCommand({
        TableName: table,
        Key: key,
        ConditionExpression: '#count <= :zero', // 間に本物の投稿で増えていたら消さない
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: { ':zero': 0 },
      }),
    );
  } catch (e) {
    if (!isCondFailed(e)) throw e;
  }
}

async function main() {
  const stack = await loadStack();
  const t = stack.tables;

  // 1. ダミーのユーザー（Cognito で seed- から探し、@example.com だけに絞る）
  const seedUsers = await listSeedUsers(stack.userPoolId);
  const subs = new Map(seedUsers.map((u) => [u.sub, u.email]));
  const blood = new Map<string, string>(); // sub → 血液型（ランキングを減らすため）
  for (const u of seedUsers) {
    const r = await db.send(new GetCommand({ TableName: t.Users, Key: { userId: u.sub }, ProjectionExpression: 'bloodType' }));
    if (r.Item?.bloodType) blood.set(u.sub, r.Item.bloodType as string);
  }
  console.log(`ダミーのユーザー：${seedUsers.length}人（${seedUsers.map((u) => u.email).join(', ') || 'なし'}）`);

  // 2. ダミーのピンを探す。(a) 記録ファイル と (b) 設定の場所にかかる cell の両方から探す
  //    どちらも「userId がダミーのユーザー」のものだけを対象にする（本物のユーザーのピンは消さない）
  const pins = new Map<string, PinRow>();
  const keep = (p: PinRow | undefined) => {
    if (p && subs.has(p.userId)) pins.set(`${p.cell}|${p.sk}`, p);
  };
  const projection = '#cell, sk, pinId, userId, cityCode, createdAt';
  const names = { '#cell': 'cell' };
  const state = readState();
  for (const s of state.pins) {
    const key = pinKeyFromPublicId(s.pinId);
    if (!key) continue;
    const r = await db.send(
      new GetCommand({ TableName: t.Pins, Key: { cell: key.cell, sk: key.sk }, ProjectionExpression: projection, ExpressionAttributeNames: names }),
    );
    keep(r.Item as PinRow | undefined);
  }
  const cells = [...new Set(config.places.flatMap((p) => cellsForBounds(boundsOf(p))))];
  for (const cell of cells) {
    for (const item of await queryAll(t.Pins, 'cell', cell, projection, names)) keep(item as PinRow);
  }
  console.log(`ダミーのピン：${pins.size}件（記録ファイル ${state.pins.length}件、調べた cell ${cells.length}個）`);

  // 3. ピンについたコメント・リアクション（本物のユーザーが付けたものも、ピンと一緒に消える）
  const children = new Map<string, { table: string; key: Record<string, string> }[]>(); // ピン → 消すもの
  let commentN = 0;
  let reactionN = 0;
  for (const [id, p] of pins) {
    const list: { table: string; key: Record<string, string> }[] = [];
    for (const c of await queryAll(t.Comments, 'pinId', p.pinId, 'pinId, sk', {})) {
      list.push({ table: t.Comments, key: { pinId: p.pinId, sk: c.sk as string } });
      commentN++;
    }
    for (const r of await queryAll(t.Reactions, 'pinId', p.pinId, 'pinId, sk', {})) {
      list.push({ table: t.Reactions, key: { pinId: p.pinId, sk: r.sk as string } });
      reactionN++;
    }
    children.set(id, list);
  }
  console.log(`コメント：${commentN}件、リアクション：${reactionN}件`);

  // 4. ランキング。ピン1件ごとに、その月の市町村・血液型の件数を1減らす。人の行は最後にまとめて消す
  const rankingRows = (p: PinRow) => {
    const month = p.createdAt.slice(0, 7);
    const rows: { pk: string; key: string }[] = [];
    const b = blood.get(p.userId);
    if (b) rows.push({ pk: `${month}#blood`, key: b });
    if (p.cityCode) rows.push({ pk: `${month}#city`, key: p.cityCode });
    return rows;
  };
  // 人の行：見つかったピンの月と、今月（途中で止まってピンが先に消えていても消せるように）
  const months = new Set([...pins.values()].map((p) => p.createdAt.slice(0, 7)));
  months.add(nowJst(new Date()).slice(0, 7));
  const userRows = [...months].flatMap((m) => seedUsers.map((u) => ({ pk: `${m}#user`, key: u.sub })));
  const decrementN = [...pins.values()].reduce((s, p) => s + rankingRows(p).length, 0);
  console.log(`ランキング：市町村・血液型の件数を合計 ${decrementN} 減らす、人の行を消す（${[...months].join('・')}）`);

  if (!execute) {
    console.log('\n確認だけしました（何も消していません）。実際に消すときは `npm run cleanup -- --execute` を実行してください。');
    return;
  }

  // ピン1件ごとに「コメント・リアクション → ランキング → ピン」の順で消す。
  // 途中で止まっても、もう一度実行すれば残ったピンの分だけ続きを消せる（件数を二重に減らさない）
  const pace = pacer(config.cleanupIntervalMs);
  let done = 0;
  for (const [id, p] of pins) {
    for (const c of children.get(id) ?? []) {
      await pace();
      await db.send(new DeleteCommand({ TableName: c.table, Key: c.key }));
    }
    for (const row of rankingRows(p)) {
      await pace();
      await decrement(t.Rankings, row, pace);
    }
    await pace();
    await db.send(
      new DeleteCommand({
        TableName: t.Pins,
        Key: { cell: p.cell, sk: p.sk },
        ConditionExpression: 'userId = :uid', // 念のため、ダミーのユーザーのピンだけ消す
        ExpressionAttributeValues: { ':uid': p.userId },
      }),
    );
    if (++done % 10 === 0 || done === pins.size) console.log(`ピン ${done}/${pins.size} を消しました`);
  }

  for (const row of userRows) {
    await pace();
    await db.send(new DeleteCommand({ TableName: t.Rankings, Key: row }));
  }
  console.log('ランキングの人の行を消しました');

  for (const u of seedUsers) {
    await pace();
    await db.send(new DeleteCommand({ TableName: t.Users, Key: { userId: u.sub } }));
    await deleteUser(stack.userPoolId, u.email);
  }
  console.log('ユーザー（DB と Cognito）を消しました');

  archiveState();
  console.log(`\n終わりました。記録ファイルは名前を変えて残しました（${STATE_PATH} → .seed-state.done-….json）`);
}

main().catch((e: unknown) => {
  const err = e as { name?: string; message?: string };
  console.error(`止まりました：${err.name ?? 'Error'}：${err.message ?? String(e)}`);
  console.error('もう一度実行すると、残っているものから続けて消します。');
  process.exitCode = 1;
});
