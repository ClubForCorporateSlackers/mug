// API を呼ぶときは必ずこの api() を使う。
// - パスは '/api/...' の相対パス（AGENTS.md の約束2）
// - POST／PUT には本文の SHA-256 を x-amz-content-sha256 に付ける（約束3）
// - ログインのトークンは X-Id-Token で送る。Authorization は使わない（約束5）

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

// docs/api-spec.md の「エラーの形」
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function api<T>(
  method: Method,
  path: `/api/${string}`,
  options: { body?: unknown; idToken?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.idToken) headers['X-Id-Token'] = options.idToken;

  let text: string | undefined;
  if (method === 'POST' || method === 'PUT') {
    // ハッシュを計算した文字列をそのまま送る（違うと AWS で 403 になる）
    text = JSON.stringify(options.body ?? {});
    headers['Content-Type'] = 'application/json';
    headers['x-amz-content-sha256'] = await sha256Hex(text);
  }

  const res = await fetch(path, { method, headers, body: text });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'UNKNOWN', data?.message ?? `通信に失敗しました（${res.status}）`);
  }
  return data as T;
}
