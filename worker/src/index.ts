import { AwsClient } from 'aws4fetch';

// このWorkerがやるのは「/api/* を署名付きで Lambda の関数URLに中継する」ことだけ（AGENTS.md の5つの約束）。
// 入力チェック・JWTの検証・位置のぼかしなどは、すべて Lambda で行う。
// 注意：headers・env・本文・クエリを console.log しない（キーやトークン、位置が漏れるため）。

// Lambda に引き継ぐヘッダー。これ以外（Authorization など）は捨てる。
// Authorization は aws4fetch が AWS の署名を入れる場所なので、受け取った値は使わない。
const FORWARD_HEADERS = ['x-id-token', 'content-type', 'x-amz-content-sha256'];

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    // 念のため：/api/ 以外は画面ファイルを返す（通常は run_worker_first で Worker を通らない）
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    // 中継先：関数URL ＋ 同じパスとクエリ（例：/api/hello → https://…lambda-url…/api/hello）
    const target = new URL(url.pathname + url.search, env.FUNCTION_URL);

    const headers = new Headers();
    for (const name of FORWARD_HEADERS) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const aws = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      service: 'lambda',
      region: 'ap-northeast-1',
    });

    const signed = await aws.sign(target.toString(), { method: request.method, headers, body });
    const response = await fetch(signed);

    // ログはこの1行だけ：メソッド・パス（クエリなし）・Lambdaの応答ステータス
    console.log(`${request.method} ${url.pathname} ${response.status}`);
    return response;
  },
} satisfies ExportedHandler<Env>;
