# API仕様書（案）蚊に刺された場所を共有するアプリ

作成：Jiji824（バックエンド担当）／ 作成日：2026-11-16（案Fに合わせて更新）／ 状態：**案（フロント担当と要確認）**

DBの中身は [db-schema.md](./db-schema.md) を参照。

---

## 1. 前提（Miroで決まったこと）

| 項目 | 決まったこと |
|---|---|
| ログイン | **Cognito**（ユーザープール）。ログイン後にニックネームと血液型を登録する |
| 匿名のルール | ピンと、ピンを立てたときのメモは**匿名**。他人のピンへのコメント・スタンプ、ランキングには**ニックネームを表示** |
| ピンの位置 | 基本は現在地。ユーザーが動かすこともできる。保存時に**半径100mの円の中でランダムにずらす**（サーバー側で実施） |
| ピンをタップしたとき | メモ、コメント（スレッド）、スタンプ（Slackのリアクションのような形）が見られる |
| ランキング | **人**（ピンを立てた回数）、**市町村**、**血液型**の3種類。期間は月単位（n月1日〜月末） |
| 蚊のいいところ | 別ページ。中身は固定の文章なのでAPIは使わない |

---

## 2. 共通のルール

| 項目 | ルール |
|---|---|
| ベースURL | **なし（相対パス）**。画面とAPIは同じドメイン（Worker「mug」）なので、`/api/...` で呼ぶ。手元の開発では Vite のプロキシで Worker に転送する |
| POST／PUTのヘッダー | `x-amz-content-sha256` に本文のSHA-256（16進数）を付ける。案Fでは、付いていれば Worker（aws4fetch）は**その値をそのまま署名に使い**、付いていなければ Worker が本文から計算する。値が本文と合わないと AWS で 403 になるので、**送る本文と同じ文字列から計算する**こと（下の「参考」）。案Eに切り替えたときにそのまま動くよう**最初から付ける** |
| 形式 | 送るのも返すのもJSON（`Content-Type: application/json`） |
| 認証 | 🔒 の付いたAPIは **`X-Id-Token: <CognitoのIDトークン>`** が必須。🌐 は不要（誰でも呼べる） |
| `Authorization` ヘッダー | **使わない**。Worker（案F）や CloudFront の OAC（案E）が、AWSの署名を `Authorization` に入れて上書きするため。ログインのトークンは必ず `X-Id-Token` で送る |
| ユーザーの特定 | IDトークンの `sub` を `userId` として使う。**フロントから `userId` は送らない** |
| 日時 | ISO 8601形式の文字列（例：`2026-11-16T10:30:00+09:00`）。サーバーが決める |
| 月 | `YYYY-MM`（例：`2026-11`）。日本時間で区切る |
| ID | サーバーが発行する文字列（ULIDを想定。作成順に並ぶ） |
| `pinId` | **`<cell>-<ULID>`** の形（例：`xn76-01JDQ3…`）。`cell` はピンの位置の geohash 4文字。DB（Pins）のキーを pinId だけで引けるようにするため（docs/adr/feature-api-social.md）。フロントは中身を気にせず、そのままURLに入れればよい |

### エラーの形

```json
{ "error": "VALIDATION_ERROR", "message": "メモは100文字以内で入力してください" }
```

| HTTPステータス | `error` | いつ |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 入力の形式や範囲が正しくない |
| 401 | `UNAUTHORIZED` | トークンがない、正しくない、期限切れ |
| 403 | `PROFILE_REQUIRED` | ニックネーム未登録のままピンやコメントを投稿しようとした |
| 404 | `NOT_FOUND` | 指定したピンがない |
| 429 | `TOO_MANY_REQUESTS` | 回数制限にかかった |
| 500 | `INTERNAL_ERROR` | サーバーのエラー |

---

## 3. API一覧

| # | メソッド | パス | 認証 | 用途 |
|---|---|---|---|---|
| 1 | GET | `/api/me` | 🔒 | 自分のプロフィールを取得 |
| 2 | PUT | `/api/me` | 🔒 | ニックネームと血液型を登録・変更 |
| 3 | POST | `/api/pins` | 🔒 | 刺された場所にピンを立てる |
| 4 | GET | `/api/pins` | 🌐 | 地図の表示範囲にあるピンを取得 |
| 5 | GET | `/api/pins/{pinId}/comments` | 🌐 | ピンのコメント一覧 |
| 6 | POST | `/api/pins/{pinId}/comments` | 🔒 | ピンにコメントする |
| 7 | PUT | `/api/pins/{pinId}/reactions/{type}` | 🔒 | スタンプを押す |
| 8 | DELETE | `/api/pins/{pinId}/reactions/{type}` | 🔒 | スタンプを取り消す |
| 9 | GET | `/api/rankings` | 🌐 | ランキングを取得 |

**追加予定（案）**：画面（`frontend/`）はこの形で呼ぶように作ってある。詳しくは「8. 追加予定のAPI」。形を変えるときは、画面の担当にも知らせる。

| # | メソッド | パス | 認証 | 用途 |
|---|---|---|---|---|
| 10 | PATCH | `/api/pins/{pinId}` | 🔒 | 自分のピンのスタンプ・メモ・位置を直す |
| 11 | DELETE | `/api/pins/{pinId}` | 🔒 | 自分のピンを消す |
| 12 | GET | `/api/me/pins` | 🔒 | 自分のピンの一覧 |
| 13 | GET | `/api/pins/{pinId}/reactions` | 🌐 | リアクションの数と、自分が押したもの |
| 14 | GET | `/api/area` | 🌐 | ある地点の市町村・今月の件数・危険度・順位 |
| 15 | GET | `/api/risk-areas` | 🌐 | 地図の範囲の危険エリア（円） |
| 16 | POST | `/api/pins/{pinId}/report` | 🔒 | ピンを通報する |
| 17 | DELETE | `/api/me` | 🔒 | アカウントを消す |
| — | GET | `/api/me`・`/api/rankings` に項目を追加 | | 下の「8」を参照 |

---

## 4. 各APIの詳細

### 1. GET /api/me 🔒 自分のプロフィール

**返すもの（200）**
```json
{ "userId": "a1b2…", "nickname": "Jiji824", "bloodType": "A", "pinCount": 3 }
```
- まだ登録していない場合は `404 NOT_FOUND`。フロントはプロフィール登録画面へ移動する

### 2. PUT /api/me 🔒 プロフィール登録・変更

**送るもの**
```json
{ "nickname": "Jiji824", "bloodType": "A" }
```

| 項目 | 必須 | ルール |
|---|---|---|
| `nickname` | ○ | 1〜20文字 |
| `bloodType` | ○ | `A` / `B` / `O` / `AB` / `UNKNOWN`（答えたくない人は `UNKNOWN`） |

**返すもの（200）**：1と同じ形

### 3. POST /api/pins 🔒 ピンを立てる

**送るもの**
```json
{ "lat": 35.68123, "lng": 139.76712, "stamp": "kayui", "memo": "公園のベンチ" }
```

| 項目 | 必須 | ルール |
|---|---|---|
| `lat` | ○ | 緯度。現在地、またはユーザーが動かした位置。日本の範囲（20〜46） |
| `lng` | ○ | 経度。日本の範囲（122〜154） |
| `stamp` | | ピンに付けるスタンプ。値は「5. スタンプの種類」の「ピンを立てるとき」（`kayui`／`itai`）から。省略か `null` ならスタンプなし（返すときは `null`） |
| `memo` | | 0〜100文字（前後の空白を除いて数える。絵文字も1文字。改行は使える）。省略なら `""`。**匿名で表示** |

- チェックの順番：ログイン（401）→ 入力（400）→ プロフィール登録済みか（403 `PROFILE_REQUIRED`）

**サーバーがやること**
1. 位置を半径100mの円の中でランダムにずらす（**元の座標は保存もログ出力もしない**）
2. 国土地理院APIでずらした位置の市町村を判定する
   - 国土地理院APIが返すのは市町村コード（`muniCd`）と町名だけ。市町村名は、Lambdaに入れた変換表（muniCd → 「都道府県＋市区町村」）で付ける
   - 結果が `{}`（海上など）か呼び出しに失敗した場合は、`city: "不明"`、`cityCode: null` として**投稿は成功させる**。市町村ランキングには数えない
3. ピンを保存し、ランキング用の件数（人・市町村・血液型）を1ずつ増やす

**返すもの（201）**
```json
{
  "pinId": "xn76-01JD…",
  "lat": 35.6815,
  "lng": 139.7668,
  "city": "東京都千代田区",
  "stamp": "kayui",
  "memo": "公園のベンチ",
  "createdAt": "2026-11-16T10:30:00+09:00"
}
```
- `lat`・`lng` はずらした後の値。**ニックネームやuserIdは返さない**（匿名）

### 4. GET /api/pins 🌐 地図の範囲内のピン

**送るもの（クエリパラメータ）**

```
GET /api/pins?minLat=35.60&maxLat=35.75&minLng=139.65&maxLng=139.85
```

| 項目 | 必須 | ルール |
|---|---|---|
| `minLat` `maxLat` `minLng` `maxLng` | ○ | 地図の表示範囲。`35.68` のような小数の形で送る。`min` は `max` 以下。縦横どちらかが0.5度より大きいと `400` |

**返すもの（200）**
```json
{
  "pins": [
    {
      "pinId": "xn76-01JD…",
      "lat": 35.6815,
      "lng": 139.7668,
      "city": "東京都千代田区",
      "stamp": "kayui",
      "memo": "公園のベンチ",
      "createdAt": "2026-11-16T10:30:00+09:00",
      "commentCount": 2,
      "reactions": { "odaiji": 3, "kaite": 1 }
    }
  ],
  "truncated": false
}
```
- 新しい順に最大200件。それ以上ある（かもしれない）場合は `truncated: true`（フロントは「拡大してください」と表示）
- ニックネームやuserIdは返さない

### 5. GET /api/pins/{pinId}/comments 🌐 コメント一覧

**返すもの（200）**
```json
{
  "comments": [
    { "commentId": "01JE…", "nickname": "shibatanaoto0428", "text": "お大事に！", "createdAt": "2026-11-16T11:00:00+09:00" }
  ]
}
```
- 古い順（スレッド表示用）。最大100件
- ピンがない（`pinId` の形が違う場合も）ときは `404 NOT_FOUND`
- `userId` は返さない

### 6. POST /api/pins/{pinId}/comments 🔒 コメントする

**送るもの**
```json
{ "text": "お大事に！" }
```
| 項目 | 必須 | ルール |
|---|---|---|
| `text` | ○ | 1〜100文字（前後の空白を除いて数える。絵文字も1文字。改行は使える。タブなどほかの制御文字は不可） |

- チェックの順番：ログイン（401）→ `pinId` の形（404）→ 入力（400）→ プロフィール登録済みか（403 `PROFILE_REQUIRED`）→ ピンがあるか（404）
- ニックネームは**投稿した時点のもの**を保存する（あとでニックネームを変えても、過去のコメントの名前は変わらない）
- ピンの `commentCount` を1増やす

**返すもの（201）**：5の1件分と同じ形（ニックネームを表示する）

### 7. PUT /api/pins/{pinId}/reactions/{type} 🔒 スタンプを押す
### 8. DELETE /api/pins/{pinId}/reactions/{type} 🔒 スタンプを取り消す

- 送るものはなし（URLに `pinId` とスタンプの種類を入れる）
- `type` は `odaiji`／`kaite`／`wakaru` だけ（ピンを立てるときの `kayui`・`itai` は 400）
- 1人が同じスタンプを押せるのは1回まで。もう一度PUTしても件数は増えない（200で今の状態を返す）。押していないものをDELETEしても件数は減らない（200）
- チェックの順番：ログイン（401）→ `pinId` の形（404）→ 種類（400）→ プロフィール登録済みか（403 `PROFILE_REQUIRED`、DELETEも同じ）→ ピンがあるか（404）
- `reactions` は押した直後の件数。0件の種類は含めない（`GET /api/pins` の `reactions` も同じ）
- `myReactions` は自分が押しているもの（`odaiji`・`kaite`・`wakaru` の順）

**返すもの（200）**
```json
{ "reactions": { "odaiji": 4, "kaite": 1 }, "myReactions": ["odaiji"] }
```

### 9. GET /api/rankings 🌐 ランキング

**送るもの（クエリパラメータ）**

```
GET /api/rankings?type=user&month=2026-11
```

| 項目 | 必須 | ルール |
|---|---|---|
| `type` | ○ | `user`（蚊に好かれてる人）／ `city`（市町村）／ `blood`（血液型） |
| `month` | | `YYYY-MM`。省略したら**日本時間の**今月 |

**返すもの（200）**
```json
{
  "type": "user",
  "month": "2026-11",
  "items": [
    { "rank": 1, "label": "Jiji824", "count": 12 },
    { "rank": 2, "label": "kokokoko0825", "count": 8 }
  ]
}
```
- `label` は、`user` ならニックネーム、`city` なら市町村名、`blood` なら血液型
- 上位20件。同じ件数なら同じ順位（例：1, 2, 2, 4）。同じ件数の中の並びは毎回同じ（市町村コード・userId などの順）
- 血液型の「答えない（`UNKNOWN`）」は**表示しない**（件数は数えている。docs/adr/feature-api-social.md）
- `type` がない・違う、`month` の形が違う（`2026-1`、`2026-13` など）ときは `400`
- 0件のときは `items: []`

---

### 参考：SHA-256ヘッダーの付け方（フロント）

```ts
async function postJson(path: string, body: unknown, idToken: string) {
  const text = JSON.stringify(body);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  return fetch(path, {                       // 例：'/api/pins'（相対パス）
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Id-Token': idToken,                 // Authorization は使わない（AWSの署名で上書きされる）
      'x-amz-content-sha256': hex,
    },
    body: text,                              // ハッシュを計算した文字列をそのまま送る
  });
}
```

## 5. スタンプの種類（案）

| `type` | 表示 | 使う場所 |
|---|---|---|
| `kayui` | かゆい | ピンを立てるとき |
| `itai` | いたい | ピンを立てるとき |
| `odaiji` | お大事に | 他人のピンへのリアクション |
| `kaite` | 掻いてあげる | 他人のピンへのリアクション |
| `wakaru` | わかる | 他人のピンへのリアクション |

---

## 6. ログインの流れ（Cognito）

1. フロントがCognitoのログイン画面（またはAmplifyのライブラリ）でサインアップ・ログインする
2. ログインするとIDトークン（JWT）がもらえる。フロントはこれを `X-Id-Token` ヘッダーに付けてAPIを呼ぶ（`Authorization` は使わない）
3. 初回は `GET /me` が `404` になるので、プロフィール登録画面で `PUT /me` を呼ぶ
4. IDトークンの期限は1時間。切れたらリフレッシュトークンで取り直す（ライブラリが自動でやる）

JWTの検証は**Lambdaで `aws-jwt-verify` を使って行う**（案Fでは API Gateway を使わない）。検証に通ったトークンの `sub` を userId として使う。

---

## 7. 未決定のこと（フロント担当と決める）

- [ ] 項目名（`lat`／`latitude` など）とスタンプの種類
- [ ] ピンを立てるときのスタンプは必須か任意か
- [ ] 自分のピンを消す機能は必要か → 画面は作った（「8」の #11 `DELETE /api/pins/{pinId}`）
- [ ] 地図に表示する最大件数（200件でよいか）
- [ ] ランキングの「人」に、プロフィール未登録の人を含めるか

---

## 8. 追加予定のAPI（案）

状態：**提案（Jiji824 さんの確認待ち）**。画面はこの形で呼ぶように作ってある（docs/adr/feature-screens-figma.md）。まだ API がないあいだは、画面にはエラー（`message`）が出る。

共通：エラーの形・`X-Id-Token`・本文の SHA-256（PATCH も付ける）は「2. 共通のルール」と同じ。**ピンの API では userId とニックネームを返さない**（自分のピンの一覧でも同じ）。

### 10. PATCH /api/pins/{pinId} 🔒 自分のピンを直す

画面の使い方：「ここで刺された！」で `POST /api/pins`（スタンプなし・メモなし）をすぐ呼び、そのあと任意でスタンプとメモを付けるときに使う。ピンのメニューの「位置を調整」「コメントを編集」でも使う。

**送るもの**（送った項目だけ変える）
```json
{ "stamp": "kayui", "memo": "公園のベンチ" }
{ "lat": 35.68123, "lng": 139.76712 }
```
- `stamp`・`memo` のルールは `POST /api/pins` と同じ（`stamp: null` でスタンプを外す）
- `lat`・`lng` を送ったら、**サーバーがもう一度100mずらしてから**保存し、市町村も判定し直す（元の座標は保存しない）
- 自分のピンでなければ `403`（`error: "NOT_OWNER"`）、ピンがなければ `404`

**返すもの（200）**：`POST /api/pins` と同じ形のピン

### 11. DELETE /api/pins/{pinId} 🔒 自分のピンを消す

- 自分のピンでなければ `403`（`NOT_OWNER`）、なければ `404`
- そのピンのコメント・リアクションも消す。ランキングの件数を減らすかは相談（app-spec F-10）

**返すもの（200）**
```json
{ "pinId": "xn76-01JDQ3…" }
```

### 12. GET /api/me/pins 🔒 自分のピンの一覧

- 新しい順に最大100件。形は `GET /api/pins` の `pins` と同じ（`reactions`・`commentCount` を含む）
- 画面はこれで「自分のピン」（どのピンが自分のものか）を見分ける

**返すもの（200）**
```json
{ "pins": [ { "pinId": "xn76-01JDQ3…", "lat": 35.68, "lng": 139.76, "city": "東京都千代田区", "stamp": "kayui", "memo": "", "createdAt": "2026-11-18T10:30:00+09:00", "commentCount": 2, "reactions": { "odaiji": 3 } } ] }
```

### 13. GET /api/pins/{pinId}/reactions 🌐 リアクションの数と自分が押したもの

- ピンの詳細を開いたときに呼ぶ。`X-Id-Token` があれば `myReactions` に自分が押したものを入れる。なければ `[]`
- 形は「7・8」の返すものと同じ

```json
{ "reactions": { "odaiji": 4, "kaite": 1 }, "myReactions": ["odaiji"] }
```

### 14. GET /api/area 🌐 ある地点の市町村・件数・危険度・順位

```
GET /api/area?lat=35.70&lng=139.62
```
- 地図の上のカード（地図の中央の地点）と、ランキングの「いまいる市町村の順位」に使う
- 市町村は国土地理院で判定する（`POST /api/pins` と同じ）。判定できなければ `city` と `prefecture` は `null`
- `risk`：その市町村の今月の件数から決める `high`／`mid`／`low`（区切りは相談）
- `prefectureRank`：都道府県の中での、今月の市町村ランキングの順位。0件なら `null`
- `diffFromLastMonth`：先月と比べた件数の差

```json
{ "city": "東京都杉並区", "prefecture": "東京都", "monthCount": 128, "risk": "high", "prefectureRank": 3, "diffFromLastMonth": 24 }
```

### 15. GET /api/risk-areas 🌐 地図の範囲の危険エリア

```
GET /api/risk-areas?minLat=35.6&maxLat=35.7&minLng=139.6&maxLng=139.8
```
- 範囲のルールは `GET /api/pins` と同じ（縦横0.5度まで）
- ピンが集まっている所を円で返す。画面は `risk` の色（`risk/high`・`mid`・`low`）で塗る

```json
{ "areas": [ { "lat": 35.70, "lng": 139.62, "radiusM": 300, "risk": "high" } ] }
```

### 16. POST /api/pins/{pinId}/report 🔒 ピンを通報する

- 送るもの：`{ "reason": "" }`（任意・0〜100文字）
- 同じ人が同じピンを何度通報しても1回と数える
- 「非表示にする」は画面だけで行う（その端末で見えなくするだけ。API は使わない）

**返すもの（200）**：`{ "ok": true }`

### 17. DELETE /api/me 🔒 アカウントを消す

- その人のプロフィール・ピン・コメント・リアクションを消し、Cognito のユーザーも消す
- 画面は、成功したらログアウトして最初の画面に戻る

**返すもの（200）**：`{ "ok": true }`

### 今ある API に足す項目

- `GET /api/me`：`monthCount`（今月立てたピンの数）、`odaijiReceived`（自分のピンがもらった「お大事に」の合計）
- `GET /api/rankings`：
  - クエリ `prefecture`（`type=city` のときだけ。例：`東京都`）で、その都道府県の市町村だけの上位20件にする
  - `type=blood` の `items` に `average`（1人あたりの回数。小数1桁）を足す
