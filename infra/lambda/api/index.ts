import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';

// APIの入口。今は「つながったか」を確かめるために hello を返すだけ。
// 注意：event をそのまま console.log しない（あとで元の座標が入るため）。
export const handler = async (_event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hello' }),
  };
};
