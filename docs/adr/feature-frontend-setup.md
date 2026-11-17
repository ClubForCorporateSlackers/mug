# ADR：feature/frontend-setup

- ブランチ：`feature/frontend-setup`
- 作業の内容：`frontend/` に React＋TypeScript＋Vite＋shadcn/ui の土台を作り、Worker がそのビルド結果を配信するようにする
- 進捗表のID：
- 期間：2026-11-17
- 記録した者：Claude Code

---

## 判断：フロントのビルドは wrangler.jsonc の `build` で行う

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

Cloudflare のビルド設定（ダッシュボード）は、ルートディレクトリが `/worker`、ビルドコマンドが `npm ci` だけ。このままでは `frontend/dist` が作られず、デプロイに失敗する。

### 決めたこと

`worker/wrangler.jsonc` に `build`（`cwd: ../frontend` で `npm ci && npm run build`）を書き、`assets.directory` を `../frontend/dist` にした。ダッシュボードの設定は変えていない。

### 理由

- 設定がリポジトリに残り、PR でレビューできる
- 本番・プレビュー・`wrangler dev` のどれでも同じ手順でビルドされる
- このPRのプレビューから、ダッシュボードを触らずに動く

### ほかの案

- ダッシュボードのビルドコマンドを変える：本番とプレビューの2か所を手で揃える必要があり、マージ前に変えると `main` のビルドが壊れる

### 影響・あとで見直すこと

- `npx wrangler dev` の起動のたびに `npm ci` が走り、数秒遅くなる。画面だけを作るときは `frontend` で `npm run dev` を使う

## 判断：仮の画面 `worker/public/index.html` を削除した

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

画面の配信元を `frontend/dist` に変えたので、仮の画面は使われなくなった。

### 決めたこと

削除した。疎通確認（`GET /api/hello`）のボタンは `frontend/src/App.tsx` の仮の画面に移した。

### 理由

使われないファイルを残すと、どちらが本物か迷うため。

### ほかの案

- 残す：配信されないので意味がない

### 影響・あとで見直すこと

地図やログインの画面を作ったら、`App.tsx` の仮の画面は置き換える。

## 判断：shadcn/ui の初期設定と、最初に入れた部品

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

shadcn/ui の初期化で、土台のライブラリや色を選ぶ必要があった。

### 決めたこと

- `npx shadcn@latest init -t vite -b radix`：スタイル `new-york`、基本色 `neutral`、アイコン `lucide`
- 部品は `button` と `card` だけ入れた。ほかは必要になったら `npx shadcn@latest add <名前>` で足す
- リンターは Vite のひな形の既定（oxlint）のまま

### 理由

ドキュメントや例が一番多い組み合わせで、フロント担当があとから変えやすい。部品は使うものだけ入れる（YAGNI）。

### ほかの案

- `base`（Base UI）や `aria`：例が少ない

### 影響・あとで見直すこと

色やスタイルは、フロント担当がデザインを決めたら `src/index.css` の変数で変える。

## 判断：API を呼ぶ共通の関数 `src/lib/api.ts` を足した

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

土台を作る指示だけで、API の呼び方は決まっていなかった。ただ AGENTS.md の約束2・3・5（相対パス、SHA-256 ヘッダー、`X-Id-Token`）は、画面ごとに書くと漏れやすい。

### 決めたこと

`api(method, path, { body, idToken })` を作った。POST／PUT では本文の SHA-256 を `x-amz-content-sha256` に自動で付け、エラーは docs/api-spec.md の形を `ApiError`（`status`・`code`・`message`）にして投げる。パスの型は `/api/...` で始まるものだけを受け付ける。

### 理由

約束を1か所で守れる。docs/api-spec.md の「参考」のコードをそのまま関数にしたもの。

### ほかの案

- 画面ごとに fetch を書く：ヘッダーの付け忘れで AWS が 403 を返す

### 影響・あとで見直すこと

- ログイン（Cognito）、地図（MapLibre）、画面の切り替え（ルーター）はまだ入れていない。それぞれの機能のPRで足す
