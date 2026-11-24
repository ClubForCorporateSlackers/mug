# ADR：worker/cloudflare

- ブランチ：`worker/cloudflare`
- 作業の内容：Cloudflare Worker「mug」を作り、画面ファイルの配信と、`/api/*` を AWS の署名付きで Lambda の関数URLに中継する処理を書く（コミット c4dbb9b）
- 進捗表のID：3-2
- 期間：2026-11-17
- 記録した者：Claude Code

---

## 判断：Worker の自動のリクエスト記録にヘッダーが残る可能性を申告し、切った

- 状態：承認

### 状況（何に迷ったか）

Worker のログ（Workers Logs）を有効にすると、コードの `console.log` とは別に、Cloudflare が**リクエストごとの記録（invocation logs）を自動で残す**。この記録にリクエストのヘッダーが入る可能性があり、そうなるとログインのトークン（`X-Id-Token`）がログに残る。AGENTS.md は「キーをログに書かない」「env を丸ごと出力しない」と決めているが、自動の記録については書かれていなかった。

### 決めたこと

Jiji824に申告し、了承を得て、次のようにした（コミット c4dbb9b）。

- `worker/wrangler.jsonc` の `observability.logs.invocation_logs` を `false` にした（ログ自体は `enabled: true` のまま）
- コードから出すログは「メソッド・パス（クエリなし）・Lambda の応答ステータス」の1行だけにした。ヘッダー・env・本文・クエリは出さない

### 理由

- トークンがログに残ると、ログを見られる人がなりすませる
- クエリには、あとで位置（緯度経度）が入る可能性がある（AGENTS.md の「元の座標をログ出力しない」）
- 1行のログがあれば、中継がつながったか・何番で失敗したかは分かる

### ほかの案

- ログをまるごと切る：つながらないときの原因が分からなくなる
- 自動の記録を残す：トークンが残るおそれがある

### 影響・あとで見直すこと

プレビュー環境は本番の設定を引き継がないことがあるので、プレビューでも同じ設定にする必要がある（feature/api-me の作業途中のコミットで `previews` に同じ設定を書いている。decisions.md #24 の案）。

---

## 判断：Worker が Lambda に引き継ぐヘッダーを3つに絞った

- 状態：承認

### 状況（何に迷ったか）

AGENTS.md は「Worker は `/api` の中継だけ」「`Authorization` は AWS の署名で上書きされる」と決めているが、ブラウザから来たヘッダーのうち、どれを Lambda に渡すかは書かれていなかった（`worker/src/index.ts`）。

### 決めたこと

Lambda に渡すのは `x-id-token`、`content-type`、`x-amz-content-sha256` の3つだけにした。ほかのヘッダー（`Authorization`、Cookie、Cloudflare が付けるヘッダーなど）はすべて捨ててから、aws4fetch で署名する。

### 理由

- 署名するヘッダーが多いと、途中で書き換わったときに署名が合わず 403 になりやすい
- 受け取った `Authorization` を残すと、AWS の署名と混ざって分かりにくい失敗になる
- Lambda に渡す情報が少ないほど、利用者の情報（IPアドレスなど）がAWS側のログに残りにくい
- 「残すものを決める」書き方なら、知らないヘッダーが増えても安全なほうに倒れる

### ほかの案

- 全部渡して、`Authorization` と `Host` だけ消す：署名の失敗や、余計な情報が渡るおそれがある

### 影響・あとで見直すこと

- Lambda で新しいヘッダーが必要になったら、`FORWARD_HEADERS` に足す必要がある（足さないと Lambda に届かない）
- 連続投稿の制限（decisions.md の未決定）を IP アドレスで行う場合は、IP を渡す方法を別に決める

---

## 判断：Worker の画面配信と設定値（run_worker_first、SPA、仮の画面、関数URLは vars）を決めた

- 状態：承認

### 状況（何に迷ったか）

AGENTS.md は「Worker が画面ファイルを配信し、`/api/*` を中継する」と決めているが、`wrangler.jsonc` の細かい設定と、フロントができるまでの画面は書かれていなかった。

### 決めたこと

- `assets.run_worker_first: ["/api/*"]`：`/api/*` だけ Worker のコードを通し、それ以外は画面ファイルをそのまま返す
- `assets.not_found_handling: "single-page-application"`：知らないパスでは `index.html` を返す（React の画面切り替え用）
- `assets.directory: "./public"` に、`/api/hello` を呼ぶだけの**仮の画面**（`worker/public/index.html`）を置いた。フロントができたら `../frontend/dist` に変える
- 関数URLは秘密ではないので `vars.FUNCTION_URL` に書いた（AWS のキーは Secrets）
- `compatibility_date: "2026-11-01"`、Secrets の型は `worker/src/secrets.d.ts` に手で書いた（`wrangler types` では作られないため）

### 理由

- 画面ファイルの配信でコードを通さないと、Worker の実行回数（無料枠）を使わず、速い
- SPA の設定がないと、`/map` などを直接開いたときに 404 になる
- 仮の画面があれば、decisions.md #18 の「画面 → Worker → Lambda（hello）」の確認がフロントを待たずにできる
- 関数URLは知られても、署名がなければ 403 になる（decisions.md #14）ので、秘密として扱う必要がない

### ほかの案

- すべてのリクエストで Worker のコードを通す：実行回数が増える
- 関数URLも Secrets に置く：秘密でないものが増えると、何が本当に秘密か分かりにくくなる

### 影響・あとで見直すこと

- フロントができたら `assets.directory` を変え、`worker/public/` を消す
- SPA の設定のため、存在しない `/api` 以外のパスも 200 で `index.html` が返る（404 はフロントで表示する）

---

## 判断：api-spec.md の x-amz-content-sha256 の説明を、aws4fetch の動きに合わせて書き直した

- 状態：承認

### 状況（何に迷ったか）

docs/api-spec.md には「案Fでは Worker が計算し直すので必須ではない」と書かれていた。しかし Worker を作ってみると、aws4fetch は `x-amz-content-sha256` が**付いていれば計算し直さず、その値をそのまま署名に使う**。フロントが本文と違う文字列からハッシュを計算すると、AWS で 403 になる。仕様書の説明と実際の動きが食い違っていた。

### 決めたこと

Worker の作業と同じコミット（c4dbb9b）で、docs/api-spec.md の「POST／PUTのヘッダー」の行を書き直した。「付いていればその値をそのまま使う」「送る本文と同じ文字列から計算する」ことを書き足した。ヘッダーを付けるルール自体（AGENTS.md の約束3）は変えていない。

### 理由

- フロント担当が「必須ではない」と読んで雑に計算すると、原因の分かりにくい 403 になる
- 仕様と違う動きを見つけたら、同じPRで docs/ を直すルール（AGENTS.md）に従った

### ほかの案

- Worker で、受け取った値を捨てて必ず計算し直す：案Fでは動くが、案E（CloudFront）に切り替えたときに初めて間違いに気づくことになる
- 仕様書を直さない：フロントで間違いが起きやすい

### 影響・あとで見直すこと

本来は「仕様と違う実装が必要なら、実装の前に人に確認する」ルールがある。今回は仕様の説明を正確にしただけでルールは変えていないため、確認の前に直した。
