# ADR：docs/architecture-diagram（発表用の構成図）

- ブランチ：`docs/architecture-diagram`
- 作業の内容：発表で映す構成図（利用の流れ・開発とデプロイの流れの2枚）を、SVG と PNG で `docs/architecture-diagram/` に作る
- 進捗表のID：なし
- 期間：2026-11-19 〜 2026-11-19
- 記録した者：Claude Code

---

## 判断：PNG は Edge を画面なしで起動して書き出し、そのスクリプトもリポジトリに入れた

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

「SVG＋PNG」は決まっていたが、PNG の作り方と大きさは決まっていなかった。この PC には draw.io・Inkscape・ImageMagick が入っていない。

### 決めたこと

- Windows に最初から入っている Microsoft Edge を画面なしで起動し、SVG を撮って PNG にする。そのためのスクリプト `docs/architecture-diagram/export-png.ps1` を追加した（指示にはなかった作業）
- 大きさは 3840×2160（1920×1080 の2倍）にした
- スクリプトは、Windows PowerShell 5.1 が日本語を正しく読めるように、UTF-8（BOM 付き）で保存した

### 理由

- 新しいソフトを入れずに作れる
- SVG を直したときに、だれでも同じ PNG を作り直せる
- 2倍の大きさなら、大きなスクリーンに映してもぼやけない

### ほかの案

- 手で PNG を書き出す：直すたびに手間がかかり、結果が人によって変わる
- Node.js のライブラリ（Puppeteer など）を入れる：ブラウザを別にダウンロードするので重い

### 影響・あとで見直すこと

- Edge の場所（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）を決め打ちにしている。Windows 以外の PC では動かない
- 文字は Windows の游ゴシック系で描いている。ほかの PC で SVG を開くと、字の形と幅が少し変わることがある（PNG は変わらない）

---

## 判断：図に描く向きと、つながりの描き方をこう決めた

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

サービスと流れの順番は指示で決まっていたが、細かい描き方は決まっていなかった。

### 決めたこと

- ⑦ は「Lambda → Cognito（公開鍵を取ってトークンを確認）」の向きにした（`infra/lambda/api/auth.ts` の `aws-jwt-verify` は Cognito から公開鍵を取る）
- Worker の Secrets と Worker 用 IAM ユーザー、Worker 用 IAM ユーザーと関数URL、CDK と開発者用 IAM ユーザーは、リクエストではないので**灰色の細線（関係）**で結んだ
- CDK は AWS の外（開発者の PC）に置き、CloudFormation・S3 を AWS の中に置いた
- E は「AWS Budgets → 開発者（メールで通知）」の向きにした
- 2枚目の「CDK で作るもの」には、`infra/lib/mug-stack.ts` で作っているもの（関数URL・Lambda、DynamoDB、Cognito、CloudWatch Logs、Worker 用 IAM ユーザー）を並べた。開発者用 IAM ユーザーと AWS Budgets は CDK の外で作っている（docs/dev-rules.md の「7.」）ので、そこには入れなかった
- AWS の公式アイコンは使わず、色分けした箱にした（Cloudflare＝オレンジ、AWS＝紺、外部＝灰色）

### 理由

- コードと docs のとおりの向きと区分けにするため
- 実線（利用）と点線（開発・デプロイ）以外の線を、見た目で区別できるようにするため

### ほかの案

- 関係の線を描かない：Worker のキーがどの IAM ユーザーのものか、図から分からなくなる

### 影響・あとで見直すこと

- 構成が変わったら、SVG を直して PNG を作り直す（README.md に手順がある）

---

## 判断：draw.io 版のアイコンの選び方と、PNG の作り方

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

「hackathon-architecture.drawio のように公式のアイコンを使った draw.io の図を作る」と指示があった。AWS 以外のサービスのアイコンと、PNG の作り方は決まっていなかった。この PC には draw.io のアプリが入っていない。

### 決めたこと

- `docs/architecture-diagram/mug-architecture.drawio` を新しく作った。1つのファイルに2ページ（利用の流れ／開発・デプロイの流れ）を入れた
- AWS のサービスは draw.io の AWS アイコン（`mxgraph.aws4`）を使った。名前は draw.io のソース（Sidebar-AWS4.js）で確かめた（Budgets は `budgets_2`、S3 は `s3`）
- 関数URL には AWS のアイコンがないので、Lambda と同じオレンジの枠の箱にした。DynamoDB のテーブルと索引は、テーブル（`table`）と GSI（`global_secondary_index`）のアイコンにした
- Cloudflare・Workers Builds は Cloudflare のロゴ、Worker は Cloudflare Workers のロゴ、GitHub・GitHub Actions はそれぞれのロゴにした（Simple Icons。hackathon-architecture.drawio と同じやり方。Workers Builds 専用のロゴはない）
- 国土地理院 API と OpenFreeMap は、公式のアイコンがないので灰色の箱にした
- 利用者のブラウザは AWS の `client`、開発者は `user` のアイコンにした
- PNG は、draw.io のビューア（viewer.diagrams.net の viewer-static.min.js）を読み込んだ HTML を Edge で開いて撮った（3840×2160）。図のデータは手元の HTML に入れただけで、外には送っていない。この方法のスクリプトはリポジトリに入れていない
- 最初に作った SVG 版は、消さずに残した

### 理由

- 既存の構成図と見た目をそろえるため
- draw.io のアプリがなくても、draw.io と同じ描き方で PNG を作れるため
- 直すときは draw.io で開いて書き出せばよいので、撮るためのスクリプトは要らないと判断した

### ほかの案

- draw.io のアプリを入れて書き出す：PC にソフトを入れることになるので、確認なしにはしなかった
- 国土地理院・OpenFreeMap に、似たアイコン（地球など）を付ける：公式のものではないので付けなかった

### 影響・あとで見直すこと

- ビューアで撮った PNG と、draw.io のアプリで書き出した PNG では、文字の位置がわずかに違うことがある
- SVG 版を残すか消すかは、人が決める
