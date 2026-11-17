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

## 判断：Storybook はプレビューの Worker の `/storybook/` で見られるようにした

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

「Storybook の確認用プレビューURLも出す」指示があった。置き場所は決まっていなかった。

### 決めたこと

- `frontend/package.json` の `build:worker` で、Workers Builds の `main` 以外のブランチ（`WORKERS_CI_BRANCH` が `main` でない）のときだけ、Storybook を `frontend/dist/storybook` にビルドする。プレビューURLの `/storybook/` で見られる
- 本番（`main`）と手元の `wrangler dev` には Storybook を入れない
- GitHub Actions の `storybook-url` が、Cloudflare のボットのコメントからプレビューURLを読み取り、Storybook のURLをPRにコメントする

### 理由

- 新しいサービスや秘密情報（Chromatic のトークン、Cloudflare の API トークン）を増やさずに済む
- 画面のプレビューと同じURLの下にあるので、同じコミットの画面と部品を見比べられる

### ほかの案

- Chromatic：トークンを GitHub に置く必要がある
- 別の Worker や Pages に GitHub Actions からデプロイ：Cloudflare の API トークンを GitHub に置く必要があり、decisions.md #16 の方針（GitHub に Cloudflare のトークンを置かない）と合わない

### 影響・あとで見直すこと

- プレビューのビルドが Storybook の分（数十秒）遅くなる
- プレビューは誰でも見られるURLなので、Storybook に秘密のデータを書かない

## 判断：Prettier の設定

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

Prettier を入れる指示はあったが、書き方の設定は決まっていなかった。

### 決めたこと

`frontend/.prettierrc.json`：シングルクォート、セミコロンあり、末尾のカンマあり、1行120文字。対象は `frontend/` だけ。shadcn/ui が作ったファイルも整形した。

### 理由

`worker/` と `infra/` の既存のコードの書き方（シングルクォート・セミコロン・1行が長め）に合わせた。

### ほかの案

- Prettier の既定（ダブルクォート、80文字）：既存のコードと書き方がずれる

### 影響・あとで見直すこと

- `worker/` と `infra/` には Prettier を入れていない。揃えるなら別のPRで
- shadcn/ui で部品を足したら `npm run format` を実行する（しないと CI の format:check で落ちる）

## 判断：Lighthouse はビルド結果をCIの中で調べ、アクセシビリティだけを必須にした

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

Lighthouse を CI に入れる指示はあったが、調べる対象と合格の基準は決まっていなかった。

### 決めたこと

- `@lhci/cli` で `frontend/dist` を CI の中で配信して調べる（`frontend/lighthouserc.json`）
- アクセシビリティ 0.9 未満は失敗。パフォーマンス・ベストプラクティス・SEO は警告だけ
- 結果は Artifacts の `lighthouse` に置く（外部の公開ストレージには送らない）

### 理由

- プレビューURLを調べると、プレビューのビルドを待つ必要があり、CI が遅く不安定になる
- 締切前に、パフォーマンスの点数で PR が止まらないようにする

### ほかの案

- プレビューURLを調べる：待ち合わせが必要
- `temporary-public-storage` に送る：URLを知っていれば誰でも見られる

### 影響・あとで見直すこと

地図（MapLibre）を入れるとパフォーマンスの点数が下がりやすい。警告が出続けるなら基準を見直す

## 判断：CodeQL は結果を Artifacts に残し、指摘があれば失敗にする

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

このリポジトリは無料プランの組織の非公開リポジトリで、GitHub の Code scanning（CodeQL の結果を GitHub の画面に出す機能）は使えない（GitHub Code Security の契約が必要）。

### 決めたこと

`.github/workflows/codeql.yml` で CodeQL を動かし、結果を送らずに（`upload: never`）SARIF ファイルとして Artifacts に残す。指摘が1件でもあればジョブを失敗にし、ログに一覧を出す。対象は JavaScript/TypeScript（frontend・worker・infra の全部）と GitHub Actions のワークフロー。クエリは `security-extended`。

### 理由

有料の契約やリポジトリの公開なしで、脆弱性のチェックを PR ごとに回せる。

### ほかの案

- リポジトリを公開する：Code scanning が無料で使えるが、公開は人が決めること
- Code Security を契約する：費用がかかる

### 影響・あとで見直すこと

リポジトリを公開したら、`upload: never` を外すと GitHub の Security タブに結果が出る
