# 決定ログ（技術選定の理由）

「何を、いつ、なぜ決めたか」の記録です。決まったことはMiroではなく**ここが正本**です。
変えるときは、このファイルを書き換えるPRを出してください（古い行は消さずに「→ #番号で変更」と書く）。

| # | 日付 | 決めたこと | 比べた選択肢 | 理由 | 決めた人 |
|---|---|---|---|---|---|
| 1 | 11/15 | 作るアプリは「ここで蚊に刺された」を投稿する位置情報SNS | 27案から投票 | 1人3票の投票で決定 | チーム |
| 2 | 11/16 | インフラはAWSを基本にする | AWS／Cloudflare／Google | チームの前提。業務でも使う技術を学べる | チーム |
| 3 | 11/16 | ~~構成は案D（Cloudflare Pages＋API Gateway＋Lambda＋DynamoDB＋Cognito）~~ → **#13で変更** | 案A〜D | — | — |
| 4 | 11/16 | ログインは**Cognito**。ログイン後にニックネームと血液型を登録する | Cognito／Supabase／Firebase／自作トークン | AWSで完結し、月1万人まで無料。ランキングにニックネームと血液型を使う | チーム |
| 5 | 11/16 | DBは**DynamoDB（プロビジョンド、合計 読み書き各25ユニット以内）** | DynamoDB／Supabase／Cloudflare D1／Firestore／RDS | AWSで完結。無料枠内なら0円。RDSはVPCが必要で時間課金のため対象外 | 小松 |
| 6 | 11/16 | IaCは**AWS CDK（TypeScript）**、Workerは**wrangler.jsonc** | CDK／CloudFormation／Terraform／手作業 | AWSはCDKが一番短く書ける。Cloudflare側は公式の設定ファイルで十分 | 小松（言語は要確認） |
| 7 | 11/16 | ~~地図は地理院タイル＋Leaflet~~ → **#21で変更**。市町村の判定は**国土地理院の逆ジオコーディングAPI** | Google Maps／Mapbox／OpenStreetMap | 無料でAPIキーが要らない。日本の市町村コードが取れる。Google の Geocoding は結果を保存し続ける使い方が規約上むずかしい | 小松 |
| 8 | 11/16 | ピンは**匿名**。他人のピンへのコメント・スタンプとランキングにはニックネームを表示 | — | Miroの「入れたい機能」で決定 | チーム |
| 9 | 11/16 | 位置は**半径100mの円の中でランダムにずらす（サーバー側）**。元の座標は保存もログ出力もしない | ずらさない／区画で表示／フロントでずらす | 自宅などが特定されないようにするため。フロントでずらすと改ざんできる | チーム |
| 10 | 11/16 | ランキングは**人・市町村・血液型**の3種類、月単位 | — | Miroの「入れたい機能」で決定 | チーム |
| 11 | 11/16 | リポジトリはOrganizationの中に**非公開**で作る。ブランチ保護は使わず、運用ルールで守る | 公開＋保護／非公開＋保護なし | 無料プランでは非公開リポジトリのブランチ保護が使えない。オーナー（田中）と合意 | チーム |
| 12 | 11/16 | AIへの指示は**AGENTS.md**に書く | CLAUDE.md／AGENTS.md | Claude Code以外のAIツールでも読めるため | 小松 |
| 13 | 11/16 | 構成は**案F**：Cloudflare Worker が入口（画面配信＋`/api` 中継）、AWS の Lambda関数URL（`AWS_IAM`）＋DynamoDB＋Cognito | 案A〜F、F'（[architecture.md](./architecture.md)） | レビューの指摘（入口を1つに、関数URLの直接呼び出しを防ぐ、API GatewayはJWT検証だけでは理由にならない）に答えつつ、初日からpushで自動デプロイとプレビューURLが使える | チーム |
| 14 | 11/16 | Worker から関数URLへは **AWSの署名（SigV4）を付けて中継**する | 署名（案F）／合言葉ヘッダー（案F'） | 署名なら AWS の手前で403になり、Lambdaが起動しない。合言葉はLambdaが起動してから断るので守りが弱い | 小松 |
| 15 | 11/16 | Worker 用の **IAMユーザーを1つだけ**作り、権限は ~~`lambda:InvokeFunctionUrl`（この関数のみ）~~ → **#23で変更**。キーは Worker の Secrets にだけ置く。メンバー用のIAMユーザーは作らない | IAMユーザー／IAM Roles Anywhere／自前OIDC | Workers は AWS の外にあり、秘密を何も置かない方法がない。一番簡単な方法で権限を最小にする | 小松 |
| 16 | 11/16 | 自動デプロイは **Cloudflare の GitHub アプリ**（対象はこのリポジトリだけ） | GitHubアプリ／GitHub Actions＋wrangler | APIトークンをGitHubに置かずに済み、外部に置く秘密が AWS のキー1つになる。プレビューURLも自動 | 小松（オーナー権限あり） |
| 17 | 11/16 | 名前は **mug**（オランダ語で蚊）。リポジトリ名と Worker 名をそろえる | mosquito-map／kamap ほか | 短く覚えやすい。Worker 名は URL になるので変えない | チーム |
| 18 | 11/16 | **11/16 24:00 の時点で（22:00から延長）、画面 → Worker → Lambda（hello）がつながっていなければ案Eに切り替える** | — | 締切までの時間を守るため。切り替えは約2〜3時間（AGENTS.md の4つの約束が前提） | チーム |
| 19 | 11/16 | ログインのトークンは **`X-Id-Token` ヘッダー**で送る（`Authorization` は使わない） | Authorization／独自ヘッダー | Worker（案F）も CloudFront の OAC（案E）も、AWSの署名を `Authorization` に入れるので、そこに入れたトークンは上書きされる | 小松 |
| 20 | 11/16 | フロントは **React＋TypeScript＋Vite＋shadcn/ui**（実行環境は Node.js） | — | フロント担当の決定 | フロント担当 |
| 21 | 11/16 | 地図の表示は **OpenFreeMap＋MapLibre GL JS**（スタイルは Positron か Liberty。フロント担当が見比べて決める）。市町村の判定は国土地理院のまま | 地理院タイル／OpenFreeMap／CARTO／Google Maps | Google Maps のような簡素な見た目でピンが目立つ。無料で登録もキーも不要。地図と市町村判定はデータ元が違うため、境界ぎわで地図の地名と判定がずれることがある（ランキングは国土地理院の判定に従う） | チーム |
| 22 | 11/16 | 市町村は国土地理院APIの **muniCd で判定・集計**し、名前は変換表で付ける。取れないとき（海上・API失敗）は「不明」として**投稿は止めない** | 市町村名の文字列で集計 | APIは名前を返さない（コードと町名だけ）。コードなら表記ゆれがない。APIは地理院地図用で外部利用の保証がないため、失敗しても動くようにする | 小松 |
| 23 | 11/17 | Worker 用 IAMユーザーの権限は、この関数だけを対象に **`lambda:InvokeFunctionUrl`（条件 `lambda:FunctionUrlAuthType = AWS_IAM`）と `lambda:InvokeFunction`（条件 `lambda:InvokedViaFunctionUrl = true`）の2つ** | `InvokeFunctionUrl` だけ（#15） | 2025年10月以降に作った関数URLは、両方の権限がないと 403 になる（公式ドキュメントで確認）。`InvokeFunction` は関数URL経由に限るので、キーで関数を直接呼ぶことはできない | 小松 |
| 24 | 11/17 | Worker のプレビュー（Workers Builds／`wrangler preview`）は、**本番と同じ関数URL（同じ Lambda・DynamoDB）を共用**する。`wrangler.jsonc` の `previews` ブロックに `vars.FUNCTION_URL` と `invocation_logs: false` を書き、AWS のキーは `wrangler preview base-config secret put` で登録する | 共用／プレビュー用にバックエンドを別に作る | ハッカソンなので環境を2つ持つ手間をかけない。プレビューは本番の設定を引き継がない（公式ドキュメントで確認）ため、`previews` ブロックに書き直す。プレビューから書いたデータは本番のDBに入る点に注意 | 小松 |

## 未決定

- [ ] LambdaとCDKの言語（フロントに合わせてTypeScriptを想定）
- [ ] 位置のぼかしが、同じ場所から何度も投稿すると平均で見破られる問題（マス目の中心に寄せる方法を検討）
- [ ] 連続投稿の制限（例：1分に1件）
- [ ] ハッカソン後もアプリを残すか
