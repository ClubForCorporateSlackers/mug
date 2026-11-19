# ADR：fix/ios-hig

- ブランチ：`fix/ios-hig`
- 作業の内容：iPhone で入力欄を触ると画面が拡大されるのを直し、押せる大きさとホームバーの扱いを Apple の HIG に合わせる
- 進捗表のID：—
- 期間：2026-11-19 〜 2026-11-19
- 記録した者：Claude Code

---

## 判断：入力欄の拡大は「文字を 16px 以上にする」で止め、拡大の禁止（`maximum-scale=1`）は使わない

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

田中の指摘（11/19）：コメントを入力しようとすると画面が拡大される。iPhone の Safari は、文字が 16px より小さい入力欄を触ると自動で拡大する。コメント欄（`CommentBox`）が 14px（`text-sm`）だった。

### 決めたこと

- `CommentBox` の文字を `text-base`（16px）にした
- `index.css` に、指で触る端末（`@media (pointer: coarse)`）では `input`・`textarea`・`select` を 16px 以上にする決まりを書いた。`@layer` の外に書いたので、`text-sm` などのクラスより優先される

### 理由

- `maximum-scale=1`・`user-scalable=no` でも拡大は止まるが、指で広げて読みたい人も拡大できなくなる（HIG・WCAG のアクセシビリティに反する。Android では指で広げることもできなくなる）
- 1か所に決まりを書いておけば、今後小さい入力欄を作っても拡大されない

### ほかの案

- viewport で拡大を禁止する：上の理由でやめた

## 判断：押せる範囲を 44×44pt 以上にする。見た目を変えたくない部品は、見えない枠（`touch-target`）で広げる

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

HIG は押せるものを 44×44pt 以上にするよう求めている。Storybook の全ストーリーを幅 390px で開いてスクリプトで測ると、20〜38px のボタンが多かった。

### 決めたこと

- 丸いアイコンボタンは 36px → 44px（`size-11`）にした：`ScreenHeader` の戻る、`ChoiceSheet`・`ReactionPicker` の閉じる、`ReactionBar` の＋
- 見た目は Figma のままにしたい部品は、`index.css` の `@utility touch-target`（`::before` の見えない枠を 44px 以上にする）で押せる範囲だけを広げた：`BloodPicker`・`FilterChip`・`PillButton`・`RankTypeTabs`・`ReactionBar` のリアクション・`LinkButton`
- shadcn の Tabs が `::after` を使っているので、`::before` を使った
- `ChoiceSheet` のラジオと `SwitchRow` のスイッチは、行（`label`）全体が押せるので変えていない

### 理由

- アイコンだけのボタンは大きくしても見た目への影響が小さい。文字の入った丸いボタンを大きくすると、Figma の見た目が変わる
- 見えない枠なら見た目を変えずに押しやすくできる

### ほかの案

- 全部の部品の高さを 44px にする：Figma の見た目が変わるのでやめた

### 影響・あとで見直すこと

- 見えない枠は、となりの部品と数 px 重なることがある（例：`ReactionBar` が折り返したとき、上下の行の間は 8px で、枠は上下に 5px ずつ広がる）
- 直したあとに、shadcn/ui そのもののストーリー（`ui-*`）を除く80個を測り直した。残っていた `ApiCheckCard` のボタン（36px）も 44px（`h-11`）にし、44pt より小さいもの・16px より小さい入力欄はなくなった
- 地図の右下の出典のボタン（MapLibre の部品）は、ストーリーがないので測っていない。出典の表示は消さない決まりなので、変えていない

## 判断：`viewport-fit=cover` を付け、下の端に置いたものの余白にホームバーの分を足す（`pb-safe-*`）

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

HIG は、画面の下の端（ホームバー）に押すものを置かないよう求めている。`viewport-fit=cover` がないと `env(safe-area-inset-bottom)` が 0 になり、ホームバーの高さが分からない。

### 決めたこと

- `index.html` の viewport に `viewport-fit=cover` を足した
- `index.css` に `@utility pb-safe-*` を作った。`pb-safe-6` は「1.5rem＋ホームバーの高さ」。ホームバーがない端末では `pb-6` と同じになる
- 使った場所：`BottomNav`（`pb-safe-2`）、`BottomSheet`（`pb-safe-6`）、下にボタンがあるページ（`LoginPage`・`SignUpPage`・`ConfirmPage`・`ResetPage`・`ResetConfirmPage`・`ProfilePage`・`LocationPage` は `pb-safe-6`、`SplashPage` は `pb-safe-8`）

### 理由

- 足し算（余白＋ホームバー）にしたのは、`max()` にするとボタンがホームバーのすぐ上に来てしまうため
- 上の端（ノッチ・ステータスバー）はブラウザが避けるので、今回は下の端だけにした

### ほかの案

- `max(1.5rem, env(...))`：上の理由でやめた

### 影響・あとで見直すこと

- iPhone の実機ではまだ確かめていない。特に横向きと、ホーム画面から開いたとき（PWA にしたあと）
