> [!IMPORTANT]
> **ハッカソン終了・アプリ停止済み・メンテナンス終了**
>
> このアプリは停止しており、今後のメンテナンスは行いません。AWS のリソースとデータは 2026-11-23 に削除したため、ログインや投稿などの機能は使えません。以下の URL や手順は、開発当時の記録です。

# mug

「ここで蚊に刺された」を投稿して、刺されやすい場所を地図で共有するアプリです。
ハッカソン（テーマ「痒い所に手が届くようなアプリ」）の作品で、締切は **2026-11-18（水）12:00** です。

> **mug** はオランダ語で「蚊」という意味です。

チーム：小松（バックエンド・インフラ）、柴田、須田、田中

URL: https://mug.st2026ne.workers.dev

## 最初に読むもの

| ファイル | 中身 |
|---|---|
| [docs/dev-rules.md](docs/dev-rules.md) | **開発ルール**（ブランチ、PR、デプロイ、秘密情報、AIの使い方）。全員必読 |
| [docs/api-spec.md](docs/api-spec.md) | API仕様書（フロントとバックの約束） |
| [docs/db-schema.md](docs/db-schema.md) | DBスキーマ |
| [docs/architecture.md](docs/architecture.md) | 構成案の比較、レビューの指摘と答え、コスト、用語集 |
| [docs/decisions.md](docs/decisions.md) | 決まったことと、その理由 |
| [AGENTS.md](AGENTS.md) | AIツールへの指示書（AIが最初に読む） |

## 構成（案F）

```
ユーザー ──▶ Cloudflare Worker「mug」（入口はここ1つ）
               ├─ /*      → 画面（Workersの静的ファイル配信）
               └─ /api/*  → AWSの署名を付けて中継
                               ↓
                           Lambda関数URL（認証 AWS_IAM：署名がないと403）
                               ├─ JWTの検証・位置のぼかし・入力チェック
                               ├─ DynamoDB
                               └─ 国土地理院API（市町村の判定）
ユーザー ──▶ Cognito（ログインだけは直接）
地図の表示：ブラウザが OpenFreeMap から直接取得（MapLibre GL JS で表示）
市町村の判定：Lambda が国土地理院の逆ジオコーディングAPIを呼ぶ
```

- **Workerのコードは `/api` の中継だけ**です。アプリの処理はすべてLambda、データはDynamoDBにあります。
- 画面とAPIが同じドメインなので、**CORSの設定は不要**です。

## フォルダ構成（予定）

```
.
├── AGENTS.md
├── README.md
├── docs/        … 仕様とルール
├── frontend/    … 画面（React＋TypeScript＋Vite＋shadcn/ui）
├── worker/      … Cloudflare Worker（画面配信の設定と /api の中継）
└── infra/       … AWS CDK と Lambda のコード
```

## デプロイ

| 対象 | 方法 | 誰が |
|---|---|---|
| 画面とWorker | `main` にマージすると Cloudflare が自動でデプロイ。PRにはプレビューURLが付く | 自動 |
| AWS（CDK） | `npx cdk deploy` | **小松だけ** |
| Workerの秘密情報（AWSのキー） | `npx wrangler secret put` | **小松だけ** |

## 開発の始め方

### 必要なもの

- Node.js（バージョンは `.nvmrc` で固定予定）
- Git、VS Code
- GitHubの2段階認証（全員オンにする）
- バックエンド担当のみ：AWS CLI v2.32.0以上（`aws login` ができる状態）、Cloudflareのアカウント

### フロント

```bash
cd frontend
cp .env.example .env    # CognitoのIDを書く（値は小松から共有。秘密情報ではない）
npm install
npm run dev
```

- APIは `/api/...` の相対パスで呼びます。手元では Vite のプロキシで本番の Worker に転送します。
  - 社内の通信などで転送が証明書のエラーになるときだけ、`MUG_PROXY_INSECURE=1 npm run dev` で起動してください（手元の転送の証明書の検証を外します。本番には関係ありません）
- よく使うコマンド：`npm run storybook`（部品の一覧）、`npm run format`（整形）、`npm run lint`、`npm run build`
- PR には画面のプレビューURLと、その下の Storybook（`<プレビューURL>/storybook/`）のURLがコメントされます
- PR の CI（`.github/workflows/frontend.yml`）：整形のチェック・lint・ビルド・Storybook のビルド・Lighthouse。ほかに CodeQL（`codeql.yml`）が全体を調べます
- APIができるまでは、docs/api-spec.md の例をダミーデータとして使って画面を作ってください。

### バックエンド（小松）

```bash
cd infra
npm install
npx cdk synth
npx cdk deploy
```

## 接続情報（デプロイ後に記入）

| 項目 | 値 | 使う場所 |
|---|---|---|
| 画面のURL | `https://mug.st2026ne.workers.dev` | ブラウザ |
| CognitoのユーザープールID | `ap-northeast-1_AFaQnY16E` | フロントの `VITE_COGNITO_USER_POOL_ID` |
| CognitoのクライアントID | `4qfvcdn0pkrg5696vfrjmoo37r` | フロントの `VITE_COGNITO_CLIENT_ID` |

秘密の値（AWSのアクセスキー、パスワード）はここに書かないでください。

## AIツールについて

このリポジトリは `AGENTS.md` にAIへの指示をまとめています。Claude Code は `AGENTS.md` を読みます。
もし読み込まれていないようなら、ルートに `CLAUDE.md` を作り、中身を `@AGENTS.md` の1行にしてください。
自分だけの指示は `CLAUDE.local.md` に書けます（コミットされません）。
