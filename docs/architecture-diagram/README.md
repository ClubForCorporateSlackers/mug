# 構成図（発表用）

発表のスライドに貼るための構成図です。2026-11-19 時点の `main` の構成（案F）を描いています。

| ファイル | 中身 |
|---|---|
| [mug-architecture-1-usage.svg](./mug-architecture-1-usage.svg)・[.png](./mug-architecture-1-usage.png) | 1枚目：利用するときの流れ（①〜⑩、実線） |
| [mug-architecture-2-deploy.svg](./mug-architecture-2-deploy.svg)・[.png](./mug-architecture-2-deploy.png) | 2枚目：開発・デプロイの流れ（A〜E、点線） |
| [export-png.ps1](./export-png.ps1) | SVG から PNG を作り直すスクリプト |

- SVG が元のファイルです。直すときは SVG を書き換えて、PNG を作り直してください
- PNG は 3840×2160（16:9）です。スライドにはそのまま貼れます

## 1枚目：利用するときの流れ

| 番号 | どこから → どこへ | 何をするか |
|---|---|---|
| ① | ブラウザ → Worker | 画面ファイルを取る |
| ② | ブラウザ → OpenFreeMap | 地図を取る（Worker・AWS を通らない） |
| ③ | ブラウザ → Cognito | ログインして IDトークンを受け取る（Worker を通らない） |
| ④ | ブラウザ → Worker | `/api/*` を呼ぶ。トークンは `X-Id-Token` ヘッダー |
| ⑤ | Worker → 関数URL | AWS の署名を付けて中継する。キーは Worker の Secrets にある、Worker 用 IAM ユーザーのもの |
| ⑥ | 関数URL → Lambda | 署名が正しいときだけ Lambda が動く（署名がなければ 403） |
| ⑦ | Lambda → Cognito | 公開鍵を取り、トークンが本物かを確かめる |
| ⑧ | Lambda → 国土地理院 API | 緯度経度から市町村を調べる（ピンを立てるときだけ） |
| ⑨ | Lambda → DynamoDB | 5つのテーブル（Users・Pins・Comments・Reactions・Rankings）と、Pins の索引 byUser を読み書きする |
| ⑩ | Lambda → CloudWatch Logs | ログを書く |

応答は、同じ道を逆にたどって戻ります。Worker のログは Workers Logs に出ます。

## 2枚目：開発・デプロイの流れ

| 記号 | どこから → どこへ | 何をするか |
|---|---|---|
| A | 開発者 → GitHub | push・PR・マージ |
| B | GitHub → GitHub Actions | PR と push で確認する（整形・lint・ビルド・Storybook・Lighthouse・CodeQL）。デプロイはしない |
| C | GitHub → Workers Builds → Worker | `main` へのマージで、フロントをビルドして Worker を本番にデプロイする（Cloudflare の GitHub アプリで連携） |
| D | 開発者 → CDK → CloudFormation | 開発者用の IAM ユーザー（MFA 付き、`aws login`）の権限で `cdk deploy` を実行する。Lambda のコードなどは S3（CDK の置き場）に置かれ、CloudFormation が AWS のリソースを作る |
| E | AWS Budgets → 開発者 | 使った金額が予算を超えたら、メールで知らせる |

## 図に書かないもの

個人名、会社名、メールアドレス、AWS のアカウントID、キーやトークン、関数URLの実際のアドレス、設定値の細かい数字。
ダミーデータを入れるスクリプト（`scripts/seed/`）も載せていません。

## PNG の作り直し方

Windows の PowerShell で、リポジトリのルートから実行します（Microsoft Edge を使います。ほかのソフトは要りません）。

```powershell
powershell -ExecutionPolicy Bypass -File docs/architecture-diagram/export-png.ps1
```
