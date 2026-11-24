# ADR：infra/cdk-skeleton

- ブランチ：`infra/cdk-skeleton`
- 作業の内容：CDK のひな形を作り、Lambda・DynamoDB・Cognito・Worker 用 IAM ユーザーを追加して AWS にデプロイできるようにする（コミット f766815、e716472）
- 進捗表のID：2-2、2-3
- 期間：2026-11-17
- 記録した者：Claude Code

---

## 判断：cdk init は --generate-only で実行し、gitの初期化とコミットをさせない

- 状態：承認

### 状況（何に迷ったか）

`infra/` に CDK のひな形を作るとき、`cdk init app --language typescript` をそのまま実行すると、`infra/` の中で `git init` と最初のコミットまで行われる。すでにリポジトリのルートで git を使っているので、入れ子のリポジトリができてしまう。指示には cdk init の実行方法までは書かれていなかった。

### 決めたこと

`cdk init app --language typescript --generate-only` で、ファイルだけを作らせた。git の初期化・コミット・`npm install` は CDK にさせず、コミットはいつもの作業ブランチで行った（コミット f766815）。

### 理由

- `infra/` に `.git` ができると、ルートのリポジトリから `infra/` の中身が見えなくなり、PRに入らない
- AGENTS.md の「`main` への直接のコミットをしない」「変更は作業ブランチで」を守るため、コミットは人が決めた流れで行いたい

### ほかの案

- 普通に `cdk init` してから `infra/.git` を消す：消し忘れると上の問題が起き、作業も1つ増える
- ひな形を手で書く：ファイルが多く、設定（cdk.json の feature flags など）を間違えやすい

### 影響・あとで見直すこと

特になし。今後 CDK のプロジェクトを増やすときも同じ方法を使う。

---

## 判断：cdk init が作った infra/AGENTS.md を削除した

- 状態：承認

### 状況（何に迷ったか）

`cdk init` が、ひな形と一緒に `infra/AGENTS.md`（CDK が用意した一般的なAI向けの説明）を作った。リポジトリのルートにはチームの `AGENTS.md` がある。AIツールはフォルダごとの AGENTS.md も読むことがあるので、2つあると、どちらのルールに従うかがあいまいになる。

### 決めたこと

`infra/AGENTS.md` を削除し、コミットに入れなかった（コミット f766815 には含まれていない）。

### 理由

- AIへの指示は、ルートの `AGENTS.md` の1か所にまとめる（decisions.md #12）
- CDK の一般的な説明には、このプロジェクトのルール（タグ、DESTROY、デプロイはJiji824だけ など）と合わない内容が混ざるおそれがある

### ほかの案

- 残して、中身をこのプロジェクト向けに書き直す：ルールが2か所に分かれ、片方だけ直し忘れる
- 残したまま使う：上のとおり、ルールの食い違いが起きうる

### 影響・あとで見直すこと

CDK を更新して `cdk init` し直すときは、また作られるので同じように消す。`infra/README.md` は cdk init の英語のまま残っている（害はないので触っていない）。

---

## 判断：explicitStackTags を false にして、スタック自体にもタグを付ける

- 状態：承認

### 状況（何に迷ったか）

AGENTS.md は「`Tags.of(app)` で4つのタグを付ける」と決めている。ところが、新しい `cdk init` が作る `cdk.json` では feature flag `@aws-cdk/core:explicitStackTags` が `true` になっていて、この場合 `Tags.of(app)` のタグは**中のリソースには付くが、CloudFormation のスタック自体には付かない**。指示には、スタックにタグが付くべきかまでは書かれていなかった。

### 決めたこと

`infra/cdk.json` の `@aws-cdk/core:explicitStackTags` を `false` にした（コミット f766815「スタックタグ有効」）。タグを書く場所は `infra/bin/mug.ts` の1か所のまま。

### 理由

- docs/dev-rules.md の「7. ハッカソン後の片付け」で、Tag Editor でタグ `Project = mug` を検索して消し忘れを探す。スタックにもタグがあるほうが、探しもれが減る
- スタックにタグがあると、スタックが作るリソースにも CloudFormation がタグを引き継ぐので、付け忘れが起きにくい

### ほかの案

- `true` のまま、`MugStack` の props の `tags` にもう一度書く：タグを2か所に書くことになり、AGENTS.md の「1回だけ書く」に反する
- `true` のまま何もしない：スタックにタグが付かない

### 影響・あとで見直すこと

CDK を更新して feature flag が変わったときは、この値が `false` のままか確かめる。

---

## 判断：Lambda の同時実行数を設定する前に、アカウントの上限を読み取りだけで確認した

- 状態：承認

### 状況（何に迷ったか）

AGENTS.md は「Lambda には同時実行数の上限を付ける」と決めている（`reservedConcurrentExecutions`）。ただ、作ったばかりのAWSアカウントは、アカウント全体の同時実行数の上限が小さいことがある。その場合、関数ごとの予約（reserved）ができず、`cdk deploy` が失敗する。指示には、上限を確かめるかどうかは書かれていなかった。

### 決めたこと

設定を書く前に、AWS の設定を**読み取るだけ**のコマンド（`aws lambda get-account-settings` など）でアカウントの上限を確認した。そのうえで `reservedConcurrentExecutions: 2` にした（コミット e716472）。設定の変更や上限緩和の申請はしていない。

### 理由

- デプロイ（Jiji824が実行）で初めて失敗に気づくより、先に分かるほうが締切に間に合う
- 読み取りだけなので、AWS のリソースを変えない（AGENTS.md の「AIが勝手に実行してはいけないこと」に当たらない）

### ほかの案

- 確かめずに設定する：上限が小さいとデプロイが失敗する
- 上限緩和を申請する：AIが勝手にやることではない。必要ならJiji824が判断する

### 影響・あとで見直すこと

アカウントの上限が変わった、または別のアカウントにデプロイするときは、もう一度確認する。確認したときの数値はこの記録には残していない。

---

## 判断：関数URLの呼び出しには lambda:InvokeFunction も必要ではないかと申告した

- 状態：承認（docs/decisions.md #23 に移した）

### 状況（何に迷ったか）

docs/decisions.md #15 では、Worker 用 IAM ユーザーの権限は `lambda:InvokeFunctionUrl` だけと決まっていた。しかし、2025年10月以降に作った関数URLは、`lambda:InvokeFunctionUrl` と `lambda:InvokeFunction` の**両方**がないと 403 になる、と AWS の公式ドキュメントに書かれていた。決定と食い違うので、黙ってどちらかを選ばず、実装の前に人に伝えた。

### 決めたこと

Jiji824に申告し、了承を得てから、次の2つの権限を付けた（コミット e716472）。

- `lambda:InvokeFunctionUrl`（この関数だけ。条件 `lambda:FunctionUrlAuthType = AWS_IAM`）
- `lambda:InvokeFunction`（この関数だけ。条件 `lambda:InvokedViaFunctionUrl = true`）

同じコミットで docs/decisions.md（#15 を「#23で変更」にし、#23 を追加）と docs/architecture.md を更新した。条件なしの `InvokeFunction` がないことを確かめるテストも足した。

### 理由

- #15 のままだと、デプロイしても Worker から呼べない（403）
- `InvokeFunction` は「関数URL経由のときだけ」に絞れるので、キーが漏れても関数を直接呼ぶことはできず、権限を最小にする方針（#15）は守れる

### ほかの案

- #15 のとおり `InvokeFunctionUrl` だけにする：動かない
- 条件なしで `InvokeFunction` を付ける：キーで関数を直接呼べてしまう

### 影響・あとで見直すこと

チームの決定として decisions.md #23 に移した。AWS の仕様がまた変わったら見直す。

---

## 判断：Lambda の実行環境と設定値（Node.js 24、256MB、10秒、同時実行2、esbuild）を選んだ

- 状態：承認

### 状況（何に迷ったか）

AGENTS.md と docs/ には「Lambda は Node.js / TypeScript」「同時実行数の上限を付ける」「ログは1週間」までは書かれているが、ランタイムの版、メモリ、タイムアウト、同時実行数の値、ビルドの方法は書かれていなかった（コミット e716472、`infra/lib/mug-stack.ts`）。

### 決めたこと

- ランタイム：`NODEJS_24_X`
- メモリ：256MB、タイムアウト：10秒
- 同時実行数の上限：`reservedConcurrentExecutions: 2`
- `NodejsFunction` を使い、`esbuild` を `infra/` の devDependencies に足した（`@types/aws-lambda` も追加）

### 理由

- Node.js 24 は、いま Lambda で使える新しい長期サポート版
- 256MB：DynamoDB と国土地理院API を呼ぶだけなので十分。128MB だと起動（コールドスタート）が遅くなりやすい
- 10秒：国土地理院APIが遅いときも待てるが、固まったときに長く課金されない長さ
- 同時実行2：ハッカソンの利用者数なら足りる。ループやいたずらで大量に動いても料金が増えにくい
- esbuild を入れておくと、CDK が Docker を使わずに手元で TypeScript をまとめられる（Jiji824の PC に Docker がなくてもデプロイできる）

### ほかの案

- メモリ 128MB：安いが遅い。無料枠の範囲なら 256MB でも料金はほぼ変わらない
- 同時実行 5〜10：発表で一斉に使われても詰まりにくいが、暴走したときの上限が上がる
- esbuild なし：Docker が必要になる

### 影響・あとで見直すこと

- 発表のときに大勢が同時に使うと、同時実行2では 429（スロットリング）が出るおそれがある。発表前に値を見直す
- 国土地理院APIの待ち時間は、Lambda のコードの中でも短めの時間で打ち切るのがよい（ピンのAPIを作るときに決める）

---

## 判断：Cognito ユーザープールの設定（自分で登録・メールでログイン・SRP・削除可能）を選んだ

- 状態：承認

### 状況（何に迷ったか）

docs/ と AGENTS.md には「ログインは Cognito ユーザープール」「アプリクライアントはクライアントシークレットなし」までは書かれているが、何でログインするか、だれが登録できるか、どのログイン方式を使うか、削除の設定は書かれていなかった（コミット e716472、`infra/lib/mug-stack.ts`）。

### 決めたこと

- `selfSignUpEnabled: true`：利用者が自分で登録できる
- `signInAliases: { email: true }`、`autoVerify: { email: true }`：メールアドレスでログインし、登録時に確認コードを送る
- アプリクライアント：`authFlows: { userSrp: true }`、`preventUserExistenceErrors: true`
- ユーザープールにも `removalPolicy: RemovalPolicy.DESTROY` を付けた（AGENTS.md で必須なのは DynamoDB とロググループだけ）

### 理由

- SNS なので、だれでも自分で登録できる必要がある
- メールアドレスは覚えやすく、ニックネームは別に登録する（decisions.md #4）ので、ログイン名を別に作らなくてよい
- SRP はパスワードをそのまま送らない方式で、ブラウザ用のライブラリ（Amplify など）の標準
- `preventUserExistenceErrors` で、「そのメールは登録されていません」から登録の有無を探られるのを防ぐ
- ユーザープールを DESTROY にしないと、`cdk destroy` のあとに残り、片付け（dev-rules.md の7）で消し忘れる

### ほかの案

- 電話番号やユーザー名でログイン：SMS は料金がかかる。ユーザー名はニックネームと紛らわしい
- 管理者だけが登録できる：SNS として使えない
- ユーザープールを RETAIN（残す）：ハッカソン後の片付けが手作業になる

### 影響・あとで見直すこと

- 確認メールは Cognito の標準の送信を使っている。1日に送れる数に上限がある（少ない）ので、発表のときに大勢が登録すると届かないおそれがある
- DESTROY なので、`cdk destroy` するとユーザーも全部消える。アプリを残す場合は見直す
- テスト用のトークン取得のための `adminUserPassword` は、プロフィールAPIの作業（docs/adr/feature-api-me.md）で足す
