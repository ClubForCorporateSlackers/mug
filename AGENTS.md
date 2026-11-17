# AGENTS.md

このファイルは、AIコーディングツール（Claude Code など）が作業の最初に読む指示書です。
人間向けの説明は README.md と docs/ にあります。ここには**AIに必ず守ってほしいこと**だけを短く書きます。

## プロジェクト

- mug：「ここで蚊に刺された」を投稿し、刺されやすい場所を地図で共有する位置情報SNS（ハッカソン作品）
- 締切：2026-11-18（水）12:00。**動くことを最優先**し、作り込みすぎない
- 説明は日本語で。開発者はWebアプリ開発の初心者なので、何をなぜ変えたかを短く説明すること

## 構成（案F。詳しくは docs/architecture.md）

- 入口：Cloudflare Worker「mug」（`worker/`）。画面ファイルを配信し、`/api/*` をAWSの署名（SigV4、aws4fetch）を付けて Lambda関数URL に中継する
- バックエンド：Lambda（Node.js / TypeScript、`infra/`）の関数URL（認証 `AWS_IAM`）→ DynamoDB
- ログイン：Cognito ユーザープール。**JWTの検証はLambdaで行う**（aws-jwt-verify）。トークンは `X-Id-Token` ヘッダーで受け取り、`sub` を userId として使う
- フロント：React＋TypeScript＋Vite、UI部品は shadcn/ui（Tailwind CSS）。地図は MapLibre GL JS＋OpenFreeMap（キー不要。スタイルは Positron か Liberty。出典表示は消さない）。市町村の判定は Lambda から国土地理院の逆ジオコーディングAPI。開発環境は Node.js
- IaC：AWS は CDK（TypeScript、東京 ap-northeast-1）、Worker は `worker/wrangler.jsonc`

## 仕様（実装前に必ず読む）

- API：docs/api-spec.md
- DB：docs/db-schema.md
- 決まったことと理由：docs/decisions.md
- 仕様と違う実装が必要になったら、**実装を進める前に人間に確認**し、同じPRで docs/ も更新する

## 5つの約束（いつでも案Eに切り替えられるようにするため）

1. **Workerのコードは `/api` の中継だけ**。位置のぼかし、入力チェック、JWTの検証、DB操作などの処理は、すべてLambdaに書く
2. **フロントからAPIは `/api/...` の相対パスで呼ぶ**。ドメインやURLを書き込まない
3. **POST／PUTには最初から `x-amz-content-sha256` ヘッダー**（本文のSHA-256、16進数）を付ける
4. **Cloudflareにしかない機能（KV、D1、Durable Objects など）は使わない**。データはDynamoDBに置く
5. **ログインのトークンは `X-Id-Token` ヘッダーで送る**。`Authorization` はAWSの署名に使われて上書きされるので、アプリでは使わない

## 秘密情報の扱い

- AWSのアクセスキーは、Worker の Secrets（`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`）にだけ置く
- キーを**コード、ログ、`wrangler.jsonc` の `vars`、リポジトリに書かない**。`console.log(env)` のように env を丸ごと出力しない
- ローカルで試すときは `worker/.dev.vars`（コミットしない）を使う
- CognitoのユーザープールIDとクライアントIDは秘密ではない。アプリクライアントは**クライアントシークレットなし**で作る

## アプリとして必ず守ること

- **元の座標を保存・ログ出力・返却しない**。位置はLambdaで半径100mの円の中でランダムにずらしてから保存する
- **ピンとピンのメモは匿名**。ピンのAPIでは userId とニックネームを返さない
- userId は**フロントから受け取らない**。必ずIDトークンの `sub` を使う
- DynamoDB は**プロビジョンドモード**。全テーブルの合計で読み書き各25ユニット以内（docs/db-schema.md の配分を守る）。Auto Scaling・PITR・バックアップ・Streams・オンデマンドは使わない
- Scan は使わない。Query と Limit を使う
- Lambda には同時実行数の上限を付ける。ログの保存期間は1週間にする
- 入力は必ずチェックする（緯度経度の範囲、文字数）。エラーは docs/api-spec.md の形で返す

## AWSリソースのタグと削除の設定（あとで一括で片付けるため）

- CDKのアプリ全体に、次の4つのタグを必ず付ける（`infra/bin/` のエントリで1回だけ書く。個別のリソースで上書きしない）
  ```ts
  Tags.of(app).add('Project', 'mug');
  Tags.of(app).add('Owner', 'komatsu');
  Tags.of(app).add('Purpose', 'hackathon-2026');
  Tags.of(app).add('DeleteAfter', '2026-11-30');
  ```
- DynamoDB のテーブルとロググループは `removalPolicy: RemovalPolicy.DESTROY` にする（`cdk destroy` で消えるようにする）
- 案Eに切り替えて S3 を使う場合は `removalPolicy: RemovalPolicy.DESTROY` と `autoDeleteObjects: true` を付ける
- AWSのリソースは**CDKの外で作らない**（例外は docs/dev-rules.md の「7. ハッカソン後の片付け」に書いたものだけ）

## AIが勝手に実行してはいけないこと

- `npx cdk deploy`、`npx wrangler deploy`、`npx wrangler secret put`（実行するのは小松だけ）
- `main` への直接のコミット・push
- 秘密情報の作成・表示・コピー

## コマンド

```bash
# AWS（infra/）
npm install
npm test
npx cdk synth        # デプロイせずに確認

# Worker（worker/）
npm install
npx wrangler dev     # ローカルで中継を試す（秘密情報は .dev.vars）

# フロント（frontend/）
npm install
npm run dev
```

## 作業の進め方

- 変更は小さく。1つのPRで1つの機能
- 作業ブランチで作業する（docs/dev-rules.md）
- 大きな変更の前には、計画を出して人間の確認を待つ

## 判断の記録（ADR：Agent Decision Record）

ここでいう ADR は「**AIが自分で決めたことの記録**（Agent Decision Record）」です。設計の決定を残す一般的な ADR（Architecture Decision Record）とは**別物**です。チームの決定の正本は docs/decisions.md で、docs/adr/ は「AIが決めて、人の確認を待っているもの」を置く場所です。

- 仕様書（docs/）や AGENTS.md に書かれていないことを、AIが自分の判断で決めたときは、`docs/adr/` に記録する
- 記録するもの：ライブラリや設定値を選んだ／仕様のあいまいな部分をこう解釈した／ファイルを削除・改名した／指示と食い違うものを見つけて片方を選んだ／指示されていない作業を足した
- 記録しなくてよいもの：変数名や書き方の細かい違い、仕様書どおりの実装
- **作業ブランチ1つにつき1ファイル**。作業しているブランチ名のファイル（`docs/adr/<ブランチ名の / を - にしたもの>.md`。例：`feature/api-me` → `docs/adr/feature-api-me.md`）に判断を追記する。なければ `docs/adr/template.md` から作る
- 1つのファイルの中で、判断ごとに「`## 判断：タイトル`」の見出しと状態を付ける
- ADRは、**その判断を含む変更と同じコミット**に入れる
- 作業の報告では、追加した判断の**タイトルと1行の要約**を伝える
- 状態は最初「**提案（人の確認待ち）**」。人が「**承認**」か「**却下**」に変える（AIは自分で承認にしない）。チームの決定にするものは docs/decisions.md に移し、判断の状態に移した先の番号を書く
