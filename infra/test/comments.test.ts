import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoCommentsRepo } from '../lambda/api/comments';

// 本物の DynamoDB には送らず、送る命令の中身だけを確かめる。

afterEach(() => jest.restoreAllMocks());

test('コメント一覧は Query（古い順・Limit 付き）。userId は読まない', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({ Items: [] } as never);
  await createDynamoCommentsRepo('CommentsTable').list('01J', 100);
  const command = send.mock.calls[0][0] as QueryCommand;
  expect(command).toBeInstanceOf(QueryCommand);
  expect(command.input).toMatchObject({
    TableName: 'CommentsTable',
    KeyConditionExpression: '#pinId = :pinId',
    ExpressionAttributeValues: { ':pinId': '01J' },
    ScanIndexForward: true,
    Limit: 100,
  });
  const projected = (command.input.ProjectionExpression ?? '')
    .split(', ')
    .map((n) => command.input.ExpressionAttributeNames?.[n]);
  expect(projected.sort()).toEqual(['commentId', 'createdAt', 'nickname', 'text']);
});

test('コメントの保存は PutItem 1回', async () => {
  const send = jest.spyOn(DynamoDBDocumentClient.prototype, 'send').mockResolvedValue({} as never);
  const item = { pinId: '01J', sk: 's', commentId: 'c' } as never;
  await createDynamoCommentsRepo('CommentsTable').put(item);
  expect(send).toHaveBeenCalledTimes(1);
  expect((send.mock.calls[0][0] as PutCommand).input).toEqual({ TableName: 'CommentsTable', Item: item });
});
