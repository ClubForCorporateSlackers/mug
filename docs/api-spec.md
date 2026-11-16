# API仕様書（案）蚊に刺された場所を共有するアプリ

作成：小松（バックエンド担当）／ 作成日：2026-11-16（案Fに合わせて更新）／ 状態：**案（フロント担当と要確認）**

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
| POST／PUTのヘッダー | `x-amz-content-sha256` に本文のSHA-256（16進数）を付ける。案Fでは Worker が計算し直すので必須ではないが、案Eに切り替えたときにそのまま動くよう**最初から付ける** |
| 形式 | 送るのも返すのもJSON（`Content-Type: application/json`） |
| 認証 | 🔒 の付いたAPIは **`X-Id-Token: <CognitoのIDトークン>`** が必須。🌐 は不要（誰でも呼べる） |
| `Authorization` ヘッダー | **使わない**。Worker（案F）や CloudFront の OAC（案E）が、AWSの署名を `Authorization` に入れて上書きするため。ログインのトークンは必ず `X-Id-Token` で送る |
| ユーザーの特定 | IDトークンの `sub` を `userId` として使う。**フロントから `userId` は送らない** |
| 日時 | ISO 8601形式の文字列（例：`2026-11-16T10:30:00+09:00`）。サーバーが決める |
| 月 | `YYYY-MM`（例：`2026-11`）。日本時間で区切る |
| ID | サーバーが発行する文字列（ULIDを想定。作成順に並ぶ） |

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

---

## 4. 各APIの詳細

### 1. GET /api/me 🔒 自分のプロフィール

**返すもの（200）**
```json
{ "userId": "a1b2…", "nickname": "こまつ", "bloodType": "A", "pinCount": 3 }
```
- まだ登録していない場合は `404 NOT_FOUND`。フロントはプロフィール登録画面へ移動する

### 2. PUT /api/me 🔒 プロフィール登録・変更

**送るもの**
```json
{ "nickname": "こまつ", "bloodType": "A" }
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
| `stamp` | | ピンに付けるスタンプ。値は「5. スタンプの種類」から |
| `memo` | | 0〜100文字。**匿名で表示** |

**サーバーがやること**
1. 位置を半径100mの円の中でランダムにずらす（**元の座標は保存もログ出力もしない**）
2. 国土地理院APIでずらした位置の市町村を判定する
   - 国土地理院APIが返すのは市町村コード（`muniCd`）と町名だけ。市町村名は、Lambdaに入れた変換表（muniCd → 「都道府県＋市区町村」）で付ける
   - 結果が `{}`（海上など）か呼び出しに失敗した場合は、`city: "不明"`、`cityCode: null` として**投稿は成功させる**。市町村ランキングには数えない
3. ピンを保存し、ランキング用の件数（人・市町村・血液型）を1ずつ増やす

**返すもの（201）**
```json
{
  "pinId": "01JD…",
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
| `minLat` `maxLat` `minLng` `maxLng` | ○ | 地図の表示範囲。広すぎる範囲（目安：縦横それぞれ0.5度より大きい）は `400` |

**返すもの（200）**
```json
{
  "pins": [
    {
      "pinId": "01JD…",
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
- 新しい順に最大200件。それ以上ある場合は `truncated: true`（フロントは「拡大してください」と表示）
- ニックネームやuserIdは返さない

### 5. GET /api/pins/{pinId}/comments 🌐 コメント一覧

**返すもの（200）**
```json
{
  "comments": [
    { "commentId": "01JE…", "nickname": "しばた", "text": "お大事に！", "createdAt": "2026-11-16T11:00:00+09:00" }
  ]
}
```
- 古い順（スレッド表示用）。最大100件

### 6. POST /api/pins/{pinId}/comments 🔒 コメントする

**送るもの**
```json
{ "text": "お大事に！" }
```
| 項目 | 必須 | ルール |
|---|---|---|
| `text` | ○ | 1〜100文字 |

**返すもの（201）**：5の1件分と同じ形（ニックネームを表示する）

### 7. PUT /api/pins/{pinId}/reactions/{type} 🔒 スタンプを押す
### 8. DELETE /api/pins/{pinId}/reactions/{type} 🔒 スタンプを取り消す

- 送るものはなし（URLに `pinId` とスタンプの種類を入れる）
- 1人が同じスタンプを押せるのは1回まで。もう一度PUTしても件数は増えない

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
| `month` | | `YYYY-MM`。省略したら今月 |

**返すもの（200）**
```json
{
  "type": "user",
  "month": "2026-11",
  "items": [
    { "rank": 1, "label": "こまつ", "count": 12 },
    { "rank": 2, "label": "たなか", "count": 8 }
  ]
}
```
- `label` は、`user` ならニックネーム、`city` なら市町村名、`blood` なら血液型
- 上位20件。同じ件数なら同じ順位

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
- [ ] 自分のピンを消す機能は必要か（必要なら `DELETE /pins/{pinId}` を追加）
- [ ] 地図に表示する最大件数（200件でよいか）
- [ ] ランキングの「人」に、プロフィール未登録の人を含めるか
