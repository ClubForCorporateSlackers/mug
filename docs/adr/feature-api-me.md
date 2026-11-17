# ADR：feature/api-me

- ブランチ：`feature/api-me`
- 作業の内容：プロフィールAPI（`GET /api/me`・`PUT /api/me`）を作る。IDトークンの検証、Users テーブルの読み書き（`pinCount` を含む）、テスト用のトークン取得の準備を含む（作業途中のコミット c98331c ほか）
- 進捗表のID：4-1
- 期間：2026-11-17 〜（作業中）
- 記録した者：Claude Code

---

## 判断：Cognito のアプリクライアントに adminUserPassword を足す（テスト用のトークン取得のため）

- 状態：承認

### 状況（何に迷ったか）

`GET /api/me`・`PUT /api/me` を、デプロイした環境で試すには、Cognito の IDトークンが必要になる。しかし、まだ画面（ログイン画面）がない。アプリクライアントの設定は `authFlows: { userSrp: true }` だけで、SRP はコマンドから手で使うのが難しい。テストのためのトークンの取り方は、指示には書かれていなかった。

### 決めたこと

小松の了承を得て、アプリクライアントの `authFlows` に `adminUserPassword: true`（ADMIN_USER_PASSWORD_AUTH）を足す。これで、AWS の管理者の認証情報を持つ人が、`aws cognito-idp admin-initiate-auth` で、テスト用ユーザーの IDトークンを取れるようになる。

コードは `infra/lib/mug-stack.ts` に入れた（このブランチ。最初の記録のときは、どのブランチのコミットにもまだなかった）。`infra/test/mug-stack.test.ts` に、ログイン方式が SRP・管理者ログイン・トークン更新の3つだけで、パスワードを直接送る方式（`ALLOW_USER_PASSWORD_AUTH`）がないことを確かめるテストを足した。

### 理由

- `adminUserPassword` は、AWS の管理者の認証情報（IAM）がないと使えない。ブラウザや外の人からは使えないので、ログインの守りは弱くならない
- `userPassword`（USER_PASSWORD_AUTH）と違い、パスワードをそのまま送るログインを一般に開かずに済む

### ほかの案

- `userPassword: true` を足す：誰でもパスワードを直接送ってログインできるようになる
- 画面ができるまで待つ：締切に間に合わない
- テスト用のトークン取得を自作する：作業が増える

### 影響・あとで見直すこと

- 取ったトークン・テスト用ユーザーのパスワードは、チャット・ログ・リポジトリに残さない（AGENTS.md「秘密情報の扱い」）
- ハッカソンの提出前に、まだ必要か見直す。不要なら外す
- `cdk diff` では、アプリクライアントの `ExplicitAuthFlows` の変更として出るはず。CloudFormation では作り直し（Replacement）にならない項目なので、クライアントIDは変わらない見込み。diff に「replace」と出たら、デプロイの前に止めて確認する（クライアントIDが変わると README とフロントの値を直す必要がある）

---

## 判断：PUT /api/me の入力チェックで、仕様のあいまいな部分をこう解釈した

- 状態：提案（フロント担当の確認待ち）

### 状況（何に迷ったか）

docs/api-spec.md には `nickname` は「1〜20文字」、`bloodType` は一覧から選ぶ、とだけ書かれている。「文字」の数え方、前後の空白、改行などの扱い、ログインの確認と入力チェックのどちらを先にするかは書かれていなかった（`infra/lambda/api/me.ts`・`app.ts`）。

### 決めたこと

- ニックネームは**前後の空白を取り除いてから**数え、取り除いた値を保存する（空白だけの名前は 400）
- 文字数は**見た目の1文字に近い数え方**（`Array.from` によるコードポイント数）。🦟 は1文字
- 改行・タブなどの制御文字を含む名前は 400
- 血液型は `A / B / O / AB / UNKNOWN` の完全一致（小文字の `a` は 400）
- ログインしていなければ、入力チェックより先に 401 を返す
- 本文に `userId` があっても無視する（AGENTS.md：userId はトークンの `sub`）
- パスの末尾の `/` は無視する（`/api/me/` も `/api/me`）

### 理由

- JavaScript の `.length` だと、絵文字が2文字と数えられ、利用者には分かりにくい
- 空白だけの名前や改行入りの名前は、ランキングやコメントの表示が崩れる
- ログインしていない人に入力の中身についてのエラーを返す必要はない

### ほかの案

- `.length` で数える：絵文字を使うと20文字より少なくても弾かれる
- 前後の空白を残す：見た目では区別できない名前ができる
- 血液型の大文字・小文字を区別しない：フロントの値を一つに決めたほうが間違いが少ない

### 影響・あとで見直すこと

- 画面の入力チェックも同じ数え方にする必要がある（フロント担当に確認してもらう）
- 合成された絵文字（家族の絵文字など）は、見た目は1文字でも数文字と数えられる。気にするなら `Intl.Segmenter` に変える
- 同じ考え方をメモ（100文字）とコメント（100文字）にも使う予定

---

## 判断：プロフィールの登録と変更を UpdateItem 1回で行い、Lambda の DB 権限を2つに絞った

- 状態：承認

### 状況（何に迷ったか）

docs/api-spec.md の `PUT /api/me` は「登録・変更」の両方を受け持つ。DynamoDB にどう書くか、`createdAt` や `pinCount` を変更のときにどう扱うか、Lambda にどこまで DB の権限を与えるかは書かれていなかった（`infra/lambda/api/users.ts`・`infra/lib/mug-stack.ts`）。

### 決めたこと

- `PutItem` ではなく `UpdateItem` を1回だけ使う。`nickname`・`bloodType`・`updatedAt` は毎回書き、`createdAt` は `if_not_exists` で初回だけ書く。`pinCount` など他の項目は消さない
- DynamoDB の読み書きには `@aws-sdk/lib-dynamodb`（DocumentClient）を使う。JWT の検証には `aws-jwt-verify`（AGENTS.md どおり）
- Lambda の DB 権限は、Users テーブルの `GetItem` と `UpdateItem` だけ。他のテーブルの権限は、そのAPIを作るときに足す
- Cognito のIDと Users テーブル名は、CDK から Lambda の環境変数で渡す（秘密ではない）
- Cognito と DynamoDB を外から渡せる形（`createHandler(deps)`）にして、テストでは偽物を使う

### 理由

- 「読んでから書く」より書き込みが1回で済み、書き込みユニット（Users は 2）を節約できる
- `PutItem` だと、あとで増える `pinCount` などを上書きして消してしまう
- 権限を絞ると、コードの間違いで Scan や他のテーブルの削除をしてしまうことを防げる（AGENTS.md の「Scan は使わない」）

### ほかの案

- `GetItem` してから `PutItem`：書き込みと読み込みが増え、同時に変更したときに古い値で上書きされうる
- `dynamodb:*` の権限を付ける：楽だが、間違いを防げない

### 影響・あとで見直すこと

- ピンのAPIを作るときに、Users の `pinCount` を増やす `UpdateItem` と、Pins などの権限を足す
- `UpdateItem` は「プロフィール未登録の人」の区別をしないので、`GET /api/me` の 404 で判定する

---

## 判断：pinCount はプロフィール登録のときに 0 で入れ、変更では上書きしない。ない人は 0 として返す

- 状態：承認

### 状況（何に迷ったか）

「pinCount を Users に持たせる（GET /api/me で返す。4-2で1増やす前提）」と指示された。docs/db-schema.md の Users にはまだ `pinCount` がなく、いつ・どの値で入れるか、すでに登録した人（項目がない人）をどう扱うかは書かれていなかった。

### 決めたこと

- `PUT /api/me` の UpdateItem に `pinCount = if_not_exists(pinCount, :zero)` を足した。初めての登録では 0 が入り、変更のときは今の値のまま（0 に戻さない）。書き込みは1回のまま
- `GET /api/me` では、項目がなければ 0 を返す（今までどおり `pinCount ?? 0`）。型（`UserItem`）の `pinCount` も「なくてもよい」のままにした
- 4-2 では `ADD pinCount 1` で増やす前提にした。`ADD` は項目がなくても 1 から数えられるので、古い人でもずれない
- docs/db-schema.md の Users の例に `pinCount` を足し、「4. 操作ごとの読み書き」の「ピンを立てる」に Users 1件の書き込みを足した（書き込み4件 → 5件）

### 理由

- 登録の UpdateItem に足すだけなので、書き込みユニットが増えない
- `SET pinCount = 0` にすると、ニックネームを変えただけで数が 0 に戻ってしまう
- 項目がない人をまとめて直す処理（Scan して書き込み）は、AGENTS.md の「Scan は使わない」に反するうえ、作業も増える

### ほかの案

- 4-2 で初めて `pinCount` を入れる（登録では入れない）：DB の中身が人によって違う期間が長くなる
- 型の `pinCount` を必ずある形にする：古い人のデータで、型と中身が合わなくなる

### 影響・あとで見直すこと

- 4-2（POST /api/pins）で、Pins・Rankings と一緒に Users の `pinCount` を `ADD` する。Lambda の権限（Users の UpdateItem）はもうある
- ピンを消す機能を作る場合は、`pinCount` を減らす処理も要る（今は API にない）
- Users の書き込みユニットは 2。プロフィール変更とピン投稿が重なると足りなくなることがあるが、ハッカソンの規模なら問題ない見込み

---

## 判断：本物の DynamoDB に送る UpdateItem の中身を確かめるテストを足した

- 状態：承認

### 状況（何に迷ったか）

今までのテスト（`infra/test/api.test.ts`）は、DynamoDB の代わりに偽物（メモリ上）を使う。偽物は `users.ts` の UpdateItem と同じ動きをするように手で書いているので、本物の命令（`if_not_exists` の書き方など）を間違えても、テストは通ってしまう。指示にはテストの追加は書かれていなかった。

### 決めたこと

`infra/test/users.test.ts` を足した。DynamoDB の `send` を差し替えて（`jest.spyOn`）、本物には送らずに、送る命令が UpdateItem 1回で、`createdAt` と `pinCount` が `if_not_exists` になっていることを確かめる。新しいライブラリは入れていない。偽物の DB（`api.test.ts`）も、登録時に `pinCount` を 0 にするように合わせた。

### 理由

- `pinCount` を `SET pinCount = :zero` と書き間違えると、ニックネームの変更で数が 0 に戻る。このまちがいは本番で気づきにくい
- 命令の中身を見るだけなので、AWS にはつながず、速い

### ほかの案

- `aws-sdk-client-mock` を入れる：書きやすいが、依存が増える
- DynamoDB Local で本当に動かす：Java か Docker が要り、準備が重い

### 影響・あとで見直すこと

- UpdateExpression の文字列を見ているので、書き方（空白など）を変えるとテストも直す必要がある
- 4-2 で Pins・Rankings の書き込みを作るときも、同じ形でテストを足せる
