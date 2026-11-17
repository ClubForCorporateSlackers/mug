import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoUsersRepo } from '../lambda/api/users';

// 本物の DynamoDB には送らず、送る命令（UpdateItem）の中身だけを確かめる。

afterEach(() => jest.restoreAllMocks());

test('プロフィールの保存は UpdateItem 1回。createdAt と pinCount はないときだけ入れる', async () => {
  const send = jest
    .spyOn(DynamoDBDocumentClient.prototype, 'send')
    .mockResolvedValue({ Attributes: { userId: 'u1', pinCount: 0 } } as never);

  const repo = createDynamoUsersRepo('UsersTable');
  await repo.saveProfile('u1', 'こまつ', 'A', '2026-11-17T12:00:00+09:00');

  expect(send).toHaveBeenCalledTimes(1);
  const command = send.mock.calls[0][0] as UpdateCommand;
  expect(command).toBeInstanceOf(UpdateCommand);
  const input = command.input;
  expect(input.TableName).toBe('UsersTable');
  expect(input.Key).toEqual({ userId: 'u1' });
  expect(input.UpdateExpression).toContain('createdAt = if_not_exists(createdAt, :now)');
  expect(input.UpdateExpression).toContain('pinCount = if_not_exists(pinCount, :zero)');
  expect(input.ExpressionAttributeValues).toMatchObject({ ':zero': 0 });
  // pinCount を上書き（SET pinCount = :zero）していないこと
  expect(input.UpdateExpression).not.toMatch(/pinCount = :zero/);
});

test('pinCount は ADD で1増やす。未登録の人の項目は作らない（条件付き）', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
  await createDynamoUsersRepo('UsersTable').incrementPinCount('u1');
  const input = (send.mock.calls[0][0] as UpdateCommand).input;
  expect(input).toMatchObject({
    TableName: 'UsersTable',
    Key: { userId: 'u1' },
    UpdateExpression: 'ADD pinCount :one',
    ConditionExpression: 'attribute_exists(userId)',
    ExpressionAttributeValues: { ':one': 1 },
  });
});
