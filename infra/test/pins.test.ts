import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoPinsRepo, createDynamoRankingsRepo } from '../lambda/api/pins';

// 本物の DynamoDB には送らず、送る命令の中身だけを確かめる（Scan を使っていないことも）。

afterEach(() => jest.restoreAllMocks());

test('地図の取得は cell ごとの Query（新しい順・Limit 付き）。userId と cityCode は読まない', async () => {
  const send = jest
    .spyOn(DynamoDBDocumentClient.prototype, 'send')
    .mockResolvedValue({ Items: [], LastEvaluatedKey: { cell: 'xn76', sk: 'x' } } as never);
  const res = await createDynamoPinsRepo('PinsTable').queryCell('xn76', 200);

  expect(res).toEqual({ items: [], hasMore: true });
  const command = send.mock.calls[0][0] as QueryCommand;
  expect(command).toBeInstanceOf(QueryCommand);
  expect(command.input).toMatchObject({
    TableName: 'PinsTable',
    KeyConditionExpression: '#cell = :cell',
    ExpressionAttributeValues: { ':cell': 'xn76' },
    ScanIndexForward: false,
    Limit: 200,
  });
  const names = Object.values(command.input.ExpressionAttributeNames ?? {});
  const projected = (command.input.ProjectionExpression ?? '')
    .split(', ')
    .map((n) => command.input.ExpressionAttributeNames?.[n]);
  expect(projected).not.toContain('userId');
  expect(projected).not.toContain('cityCode');
  expect(names).toContain('createdAt');
});

test('自分のピンは索引 byUser への Query（新しい順・Limit 付き）。userId・cityCode・bloodType は読まない', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({ Items: [{ pinId: 'p' }] } as never);
  const res = await createDynamoPinsRepo('PinsTable', 'byUser').queryByUser('user-1', 100);

  expect(res).toEqual([{ pinId: 'p' }]);
  expect(send).toHaveBeenCalledTimes(1);
  const command = send.mock.calls[0][0] as QueryCommand;
  expect(command).toBeInstanceOf(QueryCommand);
  expect(command.input).toMatchObject({
    TableName: 'PinsTable',
    IndexName: 'byUser',
    KeyConditionExpression: '#uid = :uid',
    ExpressionAttributeValues: { ':uid': 'user-1' },
    ScanIndexForward: false,
    Limit: 100,
  });
  const projected = (command.input.ProjectionExpression ?? '')
    .split(', ')
    .map((n) => command.input.ExpressionAttributeNames?.[n]);
  expect(projected).not.toContain('userId');
  expect(projected).not.toContain('cityCode');
  expect(projected).not.toContain('bloodType');
  expect(projected).toEqual(expect.arrayContaining(['cell', 'sk', 'pinId', 'commentCount', 'reactions', 'createdAt']));
});

test('ピンの保存は PutItem 1回', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
  const item = { cell: 'xn76', sk: 's', pinId: 'p' } as never;
  await createDynamoPinsRepo('PinsTable').put(item);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0]).toBeInstanceOf(PutCommand);
  expect((send.mock.calls[0][0] as PutCommand).input).toEqual({ TableName: 'PinsTable', Item: item });
});

test('ランキングは pk=月#種類、key で ADD count 1。label は最新で上書き', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
  await createDynamoRankingsRepo('RankingsTable').increment('2026-11', 'city', '13101', '東京都千代田区');
  const command = send.mock.calls[0][0] as UpdateCommand;
  expect(command).toBeInstanceOf(UpdateCommand);
  expect(command.input).toEqual({
    TableName: 'RankingsTable',
    Key: { pk: '2026-11#city', key: '13101' },
    UpdateExpression: 'SET #label = :label ADD #count :one',
    ExpressionAttributeNames: { '#label': 'label', '#count': 'count' },
    ExpressionAttributeValues: { ':label': '東京都千代田区', ':one': 1 },
  });
});

const KEY = { cell: 'xn76', sk: '2026-11-17T12:00:00+09:00#01J', pinId: '01J' };

test('ピンがあるかは GetItem 1回（キーは cell と sk）', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({ Item: { pinId: '01J' } } as never);
  expect(await createDynamoPinsRepo('PinsTable').exists(KEY)).toBe(true);
  const command = send.mock.calls[0][0] as GetCommand;
  expect(command).toBeInstanceOf(GetCommand);
  expect(command.input).toMatchObject({ TableName: 'PinsTable', Key: { cell: 'xn76', sk: KEY.sk } });
});

test('commentCount は条件付きの ADD。ピンがなければ false', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
  const repo = createDynamoPinsRepo('PinsTable');
  expect(await repo.incrementCommentCount(KEY)).toBe(true);
  expect((send.mock.calls[0][0] as UpdateCommand).input).toEqual({
    TableName: 'PinsTable',
    Key: { cell: 'xn76', sk: KEY.sk },
    UpdateExpression: 'ADD commentCount :one',
    ConditionExpression: 'attribute_exists(pinId)',
    ExpressionAttributeValues: { ':one': 1 },
  });

  const err = Object.assign(new Error('failed'), { name: 'ConditionalCheckFailedException' });
  send.mockRejectedValueOnce(err as never);
  expect(await repo.incrementCommentCount(KEY)).toBe(false);
});

test('ランキングの取得は pk=月#種類 の Query 1回（Limit 付き）', async () => {
  const send = jest
    .spyOn(DynamoDBDocumentClient.prototype, 'send')
    .mockResolvedValue({ Items: [{ key: 'A', label: 'A型', count: 2 }] } as never);
  const res = await createDynamoRankingsRepo('RankingsTable').list('2026-11', 'blood', 1000);
  expect(res).toEqual([{ key: 'A', label: 'A型', count: 2 }]);
  const command = send.mock.calls[0][0] as QueryCommand;
  expect(command).toBeInstanceOf(QueryCommand);
  expect(command.input).toMatchObject({
    TableName: 'RankingsTable',
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeValues: { ':pk': '2026-11#blood' },
    Limit: 1000,
  });
});

test('お大事にの合計は索引 byUser への Query。reactions の1種類だけを読み、続きのページも最後まで読む', async () => {
  const send = jest
    .spyOn(DynamoDBDocumentClient.prototype, 'send')
    .mockResolvedValueOnce({
      Items: [{ reactions: { odaiji: 2 } }, { reactions: {} }, {}],
      LastEvaluatedKey: { userId: 'user-1', sk: 's1', cell: 'xn76' },
    } as never)
    .mockResolvedValueOnce({ Items: [{ reactions: { odaiji: 3 } }, { reactions: { odaiji: -1 } }] } as never);
  const total = await createDynamoPinsRepo('PinsTable', 'byUser').sumReactionsByUser('user-1', 'odaiji');

  expect(total).toBe(5); // マイナスの値は数えない
  expect(send).toHaveBeenCalledTimes(2);
  const [first, second] = send.mock.calls.map((c) => c[0] as QueryCommand);
  expect(first).toBeInstanceOf(QueryCommand);
  expect(first.input).toMatchObject({
    TableName: 'PinsTable',
    IndexName: 'byUser',
    KeyConditionExpression: '#uid = :uid',
    ExpressionAttributeNames: { '#uid': 'userId', '#r': 'reactions', '#t': 'odaiji' },
    ExpressionAttributeValues: { ':uid': 'user-1' },
    ProjectionExpression: '#r.#t',
  });
  expect(first.input.ExclusiveStartKey).toBeUndefined();
  expect(second.input.ExclusiveStartKey).toEqual({ userId: 'user-1', sk: 's1', cell: 'xn76' });
});

test('ランキングの1行の件数は、pk と key の両方を指定した Query（Limit 1）。行がなければ 0', async () => {
  const send = jest
    .spyOn(DynamoDBDocumentClient.prototype, 'send')
    .mockResolvedValueOnce({ Items: [{ count: 4 }] } as never)
    .mockResolvedValueOnce({ Items: [] } as never);
  const repo = createDynamoRankingsRepo('RankingsTable');

  expect(await repo.getCount('2026-11', 'user', 'user-1')).toBe(4);
  expect(await repo.getCount('2026-11', 'user', 'nobody')).toBe(0);
  const command = send.mock.calls[0][0] as QueryCommand;
  expect(command).toBeInstanceOf(QueryCommand); // GetItem の権限はないので Query
  expect(command.input).toMatchObject({
    TableName: 'RankingsTable',
    KeyConditionExpression: '#pk = :pk AND #key = :key',
    ExpressionAttributeValues: { ':pk': '2026-11#user', ':key': 'user-1' },
    ProjectionExpression: '#count',
    Limit: 1,
  });
});
