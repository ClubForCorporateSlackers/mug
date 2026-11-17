import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoPinsRepo } from '../lambda/api/pins';
import { createDynamoReactionsRepo } from '../lambda/api/reactions';

// 本物の DynamoDB には送らず、送る命令（トランザクション）の中身と、失敗したときの扱いを確かめる。

afterEach(() => jest.restoreAllMocks());

const KEY = { cell: 'xn76', sk: '2026-11-17T12:00:00+09:00#01J', pinId: '01J' };
const ITEM = { type: 'odaiji', userId: 'u1', nickname: 'こまつ', createdAt: '2026-11-17T12:00:00+09:00' };
const repo = () => createDynamoReactionsRepo('ReactionsTable', 'PinsTable');

// トランザクションが条件に合わずに取り消されたときのエラー（並び順：Pins, Reactions）
function cancelled(pins: string, reactions: string) {
  return Object.assign(new Error('Transaction cancelled'), {
    name: 'TransactionCanceledException',
    CancellationReasons: [{ Code: pins }, { Code: reactions }],
  });
}

test('押すときは Pins の件数（ピンがあるとき）と Reactions（まだないとき）を1つのトランザクションで書く', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
  expect(await repo().add(KEY, ITEM)).toBe('added');

  const command = send.mock.calls[0][0] as TransactWriteCommand;
  expect(command).toBeInstanceOf(TransactWriteCommand);
  expect(command.input.TransactItems).toEqual([
    {
      Update: {
        TableName: 'PinsTable',
        Key: { cell: 'xn76', sk: KEY.sk },
        UpdateExpression: 'SET reactions.#t = if_not_exists(reactions.#t, :zero) + :one',
        ConditionExpression: 'attribute_exists(pinId)',
        ExpressionAttributeNames: { '#t': 'odaiji' },
        ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
      },
    },
    {
      Put: {
        TableName: 'ReactionsTable',
        Item: { pinId: '01J', sk: 'odaiji#u1', ...ITEM },
        ConditionExpression: 'attribute_not_exists(sk)',
      },
    },
  ]);
});

test('取り消すときは Pins の件数を1減らし、Reactions を（あるときだけ）消す', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
  expect(await repo().remove(KEY, 'kaite', 'u1')).toBe('removed');

  const items = (send.mock.calls[0][0] as TransactWriteCommand).input.TransactItems ?? [];
  expect(items[0].Update).toMatchObject({
    TableName: 'PinsTable',
    UpdateExpression: 'SET reactions.#t = if_not_exists(reactions.#t, :one) - :one',
    ConditionExpression: 'attribute_exists(pinId)',
    ExpressionAttributeNames: { '#t': 'kaite' },
  });
  expect(items[1].Delete).toEqual({
    TableName: 'ReactionsTable',
    Key: { pinId: '01J', sk: 'kaite#u1' },
    ConditionExpression: 'attribute_exists(sk)',
  });
});

test.each([
  ['ピンがない', 'ConditionalCheckFailed', 'None', 'no-pin'],
  ['ピンもなく、押してもある', 'ConditionalCheckFailed', 'ConditionalCheckFailed', 'no-pin'],
  ['もう押している', 'None', 'ConditionalCheckFailed', 'already'],
])('押すとき：%s → %s', async (_name, pins, reactions, expected) => {
  jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockRejectedValue(cancelled(pins, reactions) as never);
  expect(await repo().add(KEY, ITEM)).toBe(expected);
});

test('取り消すとき：押していなければ absent、ピンがなければ no-pin', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send');
  send.mockRejectedValueOnce(cancelled('None', 'ConditionalCheckFailed') as never);
  expect(await repo().remove(KEY, 'kaite', 'u1')).toBe('absent');
  send.mockRejectedValueOnce(cancelled('ConditionalCheckFailed', 'None') as never);
  expect(await repo().remove(KEY, 'kaite', 'u1')).toBe('no-pin');
});

test('条件以外の理由（同時に書き込んだなど）で取り消されたときや、ほかのエラーはそのまま投げる（500）', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send');
  send.mockRejectedValueOnce(cancelled('TransactionConflict', 'None') as never);
  await expect(repo().add(KEY, ITEM)).rejects.toThrow('Transaction cancelled');
  send.mockRejectedValueOnce(new Error('boom') as never);
  await expect(repo().remove(KEY, 'kaite', 'u1')).rejects.toThrow('boom');
});

test('自分が押したかは Reactions の GetItem（キーは pinId と 種類#userId）', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({ Item: { sk: 'x' } } as never);
  expect(await repo().has('01J', 'wakaru', 'u1')).toBe(true);
  expect((send.mock.calls[0][0] as GetCommand).input).toMatchObject({
    TableName: 'ReactionsTable',
    Key: { pinId: '01J', sk: 'wakaru#u1' },
  });
});

test('スタンプの件数は Pins を強い整合性で GetItem。ピンがなければ undefined', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send');
  send.mockResolvedValueOnce({ Item: { pinId: '01J', reactions: { odaiji: 2 } } } as never);
  const pins = createDynamoPinsRepo('PinsTable');
  expect(await pins.getReactions(KEY)).toEqual({ odaiji: 2 });
  expect((send.mock.calls[0][0] as GetCommand).input).toMatchObject({
    TableName: 'PinsTable',
    Key: { cell: 'xn76', sk: KEY.sk },
    ConsistentRead: true,
  });
  send.mockResolvedValueOnce({} as never);
  expect(await pins.getReactions(KEY)).toBeUndefined();
});
