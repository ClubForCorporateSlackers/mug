# ADR：feature/ogp

- ブランチ：`feature/ogp`
- 作業の内容：URL をシェアしたときのカード（OGP）に、アプリの名前・説明・画像を出す
- 進捗表のID：—
- 期間：2026-11-19 〜 2026-11-19
- 記録した者：Claude Code

---

## 判断：OGP の画像は1200×630 の PNG を新しく作り、URL は本番の URL を直接書く

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

kokokoko0825の指示（11/19）：OGP に対応してほしい（アプリのタイトル・説明・アイコン）。OGP は docs/ のどこにも書かれていない。

### 決めたこと

- `index.html` に `og:type`・`og:site_name`・`og:title`・`og:description`・`og:url`・`og:image`（幅・高さ・代わりの文）・`og:locale`・`twitter:card`（`summary_large_image`）を足した
- タイトルは「むふ」。説明は最初の画面（`SplashPage`）の文「「ここで刺された」をみんなで共有して、蚊の多い場所を先回り。」にそろえた
- 画像は `public/og-image.png`（1200×630）。背景はアイコンと同じ黄色 `#f9de86` で、真ん中に `public/icon.svg` のキャラクターを置いた。文字は入れていない（タイトルはカードに別に出るため）
- 画像の URL と `og:url` は、本番の URL（`https://mug.st2026ne.workers.dev`）を直接書いた

### 理由

- X（Twitter）などは `og:image` が絶対 URL でないと画像を出さない。`index.html` は Worker がそのまま返すファイルなので、URL を入れ替える仕組みを足すより、直接書くほうが簡単（KISS）
- 本番の URL は README.md と docs/app-spec.md に書かれていて、秘密ではない
- 横長の画像のほうが、シェアしたときに大きく表示される。正方形のアイコンだと、横長のカードで上下が切れる

### ほかの案

- 正方形のアイコン（`pwa-512x512.png`）を使い、`twitter:card` を `summary` にする：カードが小さくなるのでやめた
- 画像に「むふ」の文字を入れる：日本語のフォントを画像に焼き込む手間がかかり、タイトルはカードに別に出るのでやめた

### 影響・あとで見直すこと

- プレビューの URL をシェアしても、画像と `og:url` は本番のものが出る
- 独自のドメインに移したら、`index.html` の2か所の URL を書き換える
- 画像を作り直すときは、`frontend/` で次を実行する（`sharp` は `@vite-pwa/assets-generator` と一緒に入っている）

  ```bash
  node -e 'const sharp=require("sharp");(async()=>{const m=await sharp("public/icon.svg",{density:300}).resize({height:480}).png().toBuffer();await sharp({create:{width:1200,height:630,channels:4,background:"#f9de86"}}).composite([{input:m,gravity:"center"}]).png({compressionLevel:9}).toFile("public/og-image.png")})()'
  ```
