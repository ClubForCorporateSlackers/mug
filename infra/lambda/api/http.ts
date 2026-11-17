import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';

// レスポンスとエラーの共通部品。エラーの形は docs/api-spec.md の「エラーの形」どおり。

// このAPIは必ず { statusCode, headers, body } の形で返す（文字列だけを返す書き方は使わない）
export type ApiResult = Exclude<LambdaFunctionURLResult, string>;

export type ErrorCode =
  | 'VALIDATION_ERROR' // 400
  | 'UNAUTHORIZED' // 401
  | 'PROFILE_REQUIRED' // 403
  | 'NOT_FOUND' // 404
  | 'TOO_MANY_REQUESTS' // 429
  | 'INTERNAL_ERROR'; // 500

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  PROFILE_REQUIRED: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

// 処理の途中で throw すると、入口（app.ts）でエラーの形に変換して返す
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function json(statusCode: number, body: unknown): ApiResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(code: ErrorCode, message: string): ApiResult {
  return json(STATUS[code], { error: code, message });
}

// 本文をJSONとして読む。読めなければ 400
export function parseJsonBody(event: LambdaFunctionURLEvent): unknown {
  if (!event.body) throw new ApiError('VALIDATION_ERROR', '本文（JSON）がありません');
  const text = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('VALIDATION_ERROR', '本文がJSONの形になっていません');
  }
}

// 日本時間の ISO 8601 文字列（例：2026-11-16T10:30:00+09:00）
export function nowJst(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace(/\.\d{3}Z$/, '+09:00');
}
