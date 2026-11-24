# ADR：fix/password-toggle

- ブランチ：`fix/password-toggle`
- 作業の内容：パスワードの入力欄に、入力した文字を見られる「表示／隠す」ボタンを付ける
- 進捗表のID：—
- 期間：2026-11-19 〜 2026-11-19
- 記録した者：Claude Code

---

## 判断：`MugField` が `type="password"` のとき、右端に目のアイコンのボタンを自動で出す

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

kokokoko0825の指示（11/19）：パスワード入力のところに、パスワードを見られるボタンを付けたい。よくあるパスワード欄の形にしたい。

パスワード欄は `LoginPage`・`SignUpPage`・`ResetConfirmPage` の3か所で、どれも `MugField` に `type="password"` を渡している。

### 決めたこと

- `MugField` で `type="password"` のときだけ、入力欄の右端に目のアイコン（lucide-react の `Eye`／`EyeOff`）のボタンを出す。押すと `type` が `text` と `password` で切り替わる
- ボタンは shadcn/ui の `Button`（`variant="ghost"`）。読み上げ用に `aria-label`（「パスワードを表示」／「パスワードを隠す」）と `aria-pressed` を付けた
- ページは変えていない。3つの画面すべてに自動で付く
- Storybook に `Password` のストーリーを足した

### 理由

- `MugField` の中で切り替えれば、ページを1つも変えずに全部のパスワード欄に付けられる（KISS・DRY）
- 表示／隠すは入力欄の見た目だけの状態なので、基本コンポーネントの中に持ってよいと判断した（ページの状態ではない）

### ほかの案

- `PasswordField` という別の基本コンポーネントを作る：`MugField` とほぼ同じ中身になり、3つのページも書き換えが要るのでやめた
- shadcn/ui の `input-group` を追加して使う：部品が1つ増えるわりに、今回はボタンを1つ重ねるだけなのでやめた

### 影響・あとで見直すこと

- 表示にしたままログインボタンを押しても、そのまま送られる（よくあるパスワード欄と同じ動き）
