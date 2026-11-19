# ADR：fix/shadcn-inputs（fix/shadcn-inputs）

- ブランチ：`fix/shadcn-inputs`
- 作業の内容：入力・選ぶ基本コンポーネントの中身を shadcn/ui の部品に置き換える
- 進捗表のID：—
- 期間：2026-11-19 〜 2026-11-19
- 記録した者：Claude Code

---

## 判断：基本コンポーネントごとに使う shadcn/ui の部品を決めた

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

作業の指示では、いくつかの部品に「A か B」の選択肢があった。

### 決めたこと

| 基本コンポーネント | 使った部品 |
|---|---|
| MugField | Field・FieldLabel・FieldDescription・Input |
| MugMemo | Field・FieldLabel・Textarea |
| CommentBox | Input ＋ Button（InputGroup は使わない。shadcn add で入った ui/input-group.tsx は使わないので消した） |
| BloodPicker | ToggleGroup（type="single"） |
| StampPicker | ToggleGroup（type="single"） |
| ReactionBar | Toggle（札）・Button（＋） |
| ReactionPicker | ToggleGroup（type="multiple"）・Button（×） |
| ChoiceSheet | RadioGroup ＋ Label・Button（×） |
| CodeField（新規） | Field・FieldLabel・InputOTP（ConfirmPage で使う） |

### 理由

- CommentBox：今の見た目は「丸い入力欄」と「離れた丸い送信ボタン」。InputGroup はボタンを枠の中に入れる形なので見た目が変わる。Input と Button なら今と同じにできる
- BloodPicker：見た目が今と同じ「札」なので ToggleGroup にした。type="single" は radiogroup／radio として読み上げられ、矢印キーでも動かせる。選択中をもう一度押したとき（空文字が来る）は無視して、外せないようにした
- ChoiceSheet：1つだけ選ぶ一覧なので RadioGroup が意味として合う。今と同じものを押しても onChoose が呼ばれるよう、onValueChange ではなく各項目の onClick で知らせる

### ほかの案

- BloodPicker を RadioGroup にする：丸いラジオボタンの見た目になり、今の札の見た目から離れるのでやめた
- ChoiceSheet を Item にする：見た目は今に近いが、ただのボタンの並びのままで、読み上げの意味はよくならないのでやめた

### 影響・あとで見直すこと

- 見た目・動きが変わった所
  - ChoiceSheet：選んだ印がチェック（✓）から、右側のラジオボタン（●）になった
  - StampPicker：読み上げが「押しボタン（aria-pressed）」から「ラジオ（aria-checked）」になった。もう一度押すと外れる動きはそのまま
  - BloodPicker・StampPicker・ReactionPicker：矢印キーで項目を移動できるようになった
  - × ボタン・＋ボタン：マウスを乗せると薄く色が付くようになった（Button の ghost の見た目）
  - MugField：補足（hint）を aria-describedby で入力欄に結び付けた（読み上げで補足も読まれる）
  - ConfirmPage：確認コードが6つの枠に1桁ずつ入れる形になり、数字以外は入らない。確認中は入力できない。エラーのときは枠が赤くなる

## 判断：基本コンポーネントの props は変えなかった

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

shadcn/ui の部品は値の受け渡し方（例：ToggleGroup の onValueChange は文字列や配列で知らせる）が今の props と違う。

### 決めたこと

すべての基本コンポーネントの props（名前と型）はそのままにし、違いはコンポーネントの中で変換した（例：ReactionPicker は前の `mine` と比べて変わった1つを探して `onPick` に渡す）。使っているページは ConfirmPage 以外変えていない。

### 理由

ページ側を変えずに済み、もう1人の作業とぶつからないため。

### ほかの案

props を shadcn/ui の形に合わせる：ページの変更が増えるのでやめた。

### 影響・あとで見直すこと

特になし。

## 判断：MugMemo の高さは今までどおり固定にした

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

shadcn/ui の Textarea は `field-sizing-content`（文字の量に合わせて高さが伸びる）が付いている。

### 決めたこと

`field-sizing-fixed` を渡して、今までどおり高さを固定にした。

### 理由

見た目と動きを今と同じにするため。

### ほかの案

伸びる動きをそのまま使う：見た目が変わるのでやめた。

### 影響・あとで見直すこと

伸びるほうがよければ `field-sizing-fixed` を消すだけでよい。

## 判断：ui/toggle.tsx の lint 警告はそのままにした

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

`npx shadcn add toggle` が作った `ui/toggle.tsx` が `toggleVariants` も export しているため、`npm run lint` に ui/button.tsx と同じ警告（react(only-export-components)）が1件増えた。

### 決めたこと

coordinator に確認し、ui/ は書き換えず、`.oxlintrc.json` も変えずにそのままにした（警告は ui/button.tsx と ui/toggle.tsx の2件）。

### 理由

ui/ の shadcn 生成ファイルは手で書き換えない約束で、CI の lint は警告では失敗しないため。

### ほかの案

`.oxlintrc.json` で ui/ を対象外にする：担当外のファイルなので、必要なら coordinator がまとめて行う。

### 影響・あとで見直すこと

ほかの作業でも ui/ に同じ警告が出ている（ui/tabs.tsx）。まとめて対処するかは coordinator が決める。
