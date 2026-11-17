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
