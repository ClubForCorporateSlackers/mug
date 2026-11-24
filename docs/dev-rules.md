# 開発ルール

ブランチ保護を使わないので、**このルールを全員で守ること**で `main` を守ります。

## 1. ブランチ

- `main`：いつでも動く状態。**直接pushしない**（マージすると画面が自動でデプロイされるため）
  - 例外：`docs/` の小さな修正（誤字・追記）だけは、Jiji824が `main` に直接pushしてよい。コードと設定は必ずPRを通す。AIは例外なく直接pushしない
- 作業ブランチ：`main` から作る。名前は `種類/内容`

| 種類 | 使うとき | 例 |
|---|---|---|
| `feature/` | 機能を作る | `feature/post-pin` |
| `fix/` | 不具合を直す | `fix/ranking-sort` |
| `docs/` | ドキュメントだけ変える | `docs/api-spec-comments` |
| `infra/` | CDKやWorkerの設定を変える | `infra/add-rankings-table` |

## 2. 1つの作業の流れ

1. **Issueを作る**：何を作るか、完成の条件（例：「api-spec.md の 3 の通りに動く」）
2. **ブランチを作る**：`git switch -c feature/post-pin`
3. **作る**：AIを使う場合は「5. AIの使い方」を参照
4. **自分で動かして確認する**（PRに付くプレビューURLでも確認できる）
5. **PRを出す**：テンプレート（下）を埋める。Issueを `Closes #番号` でつなぐ
6. **1人以上にレビューしてもらう**（承認されたらマージ）
7. **マージしたら作業ブランチを消す**

### PRの書き方

```
## やったこと
- 

## 確認したこと
- [ ] 自分の環境かプレビューURLで動いた
- [ ] api-spec.md / db-schema.md と食い違っていない（変えた場合は同じPRで更新した）
- [ ] 秘密情報（キー）をコードやログに入れていない

## 見てほしいところ
- 

Closes #
```

### 必ずていねいにレビューするもの

- `worker/` のコード（AWSのキーを使う場所）
- `.github/workflows/` やデプロイの設定
- `infra/` の IAM や権限の設定

## 3. デプロイ

| 対象 | 方法 | 誰が |
|---|---|---|
| 画面とWorker | `main` にマージすると Cloudflare が自動でデプロイ。PRにはプレビューURLが付く | 自動 |
| AWS（CDK） | `npx cdk deploy` | **Jiji824だけ** |
| Workerの秘密情報 | `npx wrangler secret put` | **Jiji824だけ** |

## 4. 秘密情報

外部に置く秘密情報は **Worker に預ける AWS のアクセスキー1つだけ**です。

- **管理者はJiji824**。キーの発行・登録・作り直し・削除はJiji824が行う
- キーは Worker の Secrets にだけ置く。**コード、ログ、チャット、メモ、スクリーンショットに残さない**
- ローカルで試すときは `worker/.dev.vars`（`.gitignore` 済み）。試し終わったら消す
- `.env` もコミットしない。必要な項目は `.env.example` に名前だけ書く
- AWSの長期アクセスキーは、このWorker用以外に作らない。人は管理者用IAMユーザー（MFA付き）でコンソールに入り、CLIは `aws login` を使う（ルートユーザーは使わない）
- **漏れたかもと思ったら、すぐJiji824に連絡**。IAMの画面でキーを無効化し、作り直す
- **全員、GitHub・Cloudflare・AWSの2段階認証をオンにする**

## 5. AIの使い方

- 1回に頼むのは小さく（1つのAPIか1つの画面まで）
- まず**計画だけ**出させて、読んでから実装させる
- 仕様はファイルで渡す（「docs/api-spec.md の POST /api/pins を見て」）
- AIが書いたコードは**必ず自分で読んで、動かして確かめる**。分からない行は説明させる
- AIが仕様にないことを自分で決めたら、`docs/adr/<ブランチ名>.md` に記録が残る（ADR：Agent Decision Record。ルールは `AGENTS.md`）。PRのレビューで「提案」の判断を読み、「承認」か「却下」にする
- AIが同じミスを2回したら、`AGENTS.md` に1行足すPRを出す
- **アクセスキー、パスワード、トークンはAIに貼らない**

## 6. 締切に向けて

- **月曜 24:00**（11/16に22:00から延長）：画面 → Worker → Lambda（hello）がつながっていなければ、案E（CloudFront）に切り替える
- **水曜 10:00**：新しい機能は打ち止め。それ以降はバグ修正だけ
- **水曜 12:00**：提出

## 7. ハッカソン後の片付け

一括削除の本体は `cdk destroy`。タグ（`Project=mug`）は**消し忘れを探すため**に使う。
アプリを残す場合は、`DeleteAfter` タグの日付を書き換え、下の「残してもよい」以外は今のまま運用する。

### 手順（担当：Jiji824）

1. `cd infra && npx cdk destroy` で、CDKで作ったものをまとめて削除する（Lambda、DynamoDB、Cognito、ロググループ、Workers用IAMユーザー）
2. CDKの外で作ったものを、下の表に沿って片付ける
3. AWSコンソールの **Tag Editor** で、リージョンを「すべて」、タグ `Project = mug` で検索し、**0件**になったことを確認する
4. 翌日以降に請求ダッシュボードで、料金が増えていないことを確認する

### CDKの外で作ったもの（`cdk destroy` では消えない）

| もの | 作り方 | 片付け |
|---|---|---|
| Workers用のアクセスキー | IAMで手動発行 | IAMユーザーごと`cdk destroy`で消える。先にキーだけ「無効化」してもよい |
| CDKの準備用スタック（`CDKToolkit`）とS3バケット | `cdk bootstrap` | 他でCDKを使わないなら、S3バケットを空にしてからCloudFormationでスタックを削除 |
| Cloudflare の Worker「mug」と Secrets | wrangler | Cloudflareのダッシュボードで Worker を削除 |
| Cloudflare の GitHubアプリ | kokokoko0825が承認 | GitHubのOrg設定で、mugリポジトリへのアクセスを外す |
| 予算アラート（AWS Budgets） | 手動 | 残してもよい（無料） |
| 管理者用IAMユーザー（Jiji824） | 手動 | 残してもよい（MFAは付けたまま） |

（任意）請求の画面で `Project` を「コスト配分タグ」として有効にすると、mug の費用だけを集計できる。
