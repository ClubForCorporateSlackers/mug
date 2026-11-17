import { createHash } from 'node:crypto';
import { config } from '../seed.config.ts';
import { sleep } from './aws.ts';

// 本物のAPI（Worker「mug」）を、フロントと同じ決まりで呼ぶ（docs/api-spec.md）
// - ログインのトークンは X-Id-Token（Authorization は使わない）
// - POST・PUT には x-amz-content-sha256（送る本文の SHA-256）

export class ApiCallError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function callApi<T>(method: Method, path: string, idToken?: string, body?: unknown): Promise<T> {
  const text = body === undefined ? undefined : JSON.stringify(body);
  const headers: Record<string, string> = {};
  if (idToken) headers['X-Id-Token'] = idToken;
  if (method === 'POST' || method === 'PUT') {
    const payload = text ?? '';
    headers['Content-Type'] = 'application/json';
    headers['x-amz-content-sha256'] = createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  // 失敗したら待ってやり直す。POST は同じものが2つできないよう、まだ処理されていないと分かる 429 だけやり直す
  const retryable = (status: number) => status === 429 || (method !== 'POST' && status >= 500);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(config.apiBase + path, { method, headers, body: text });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return json as T;
    if (attempt < 3 && retryable(res.status)) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    // エラーの本文（error・message）だけを出す。トークンやヘッダーは出さない
    throw new ApiCallError(res.status, String(json.error ?? ''), `${method} ${path} が ${res.status} ${json.error ?? ''}：${json.message ?? ''}`);
  }
}
