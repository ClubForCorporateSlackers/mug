# ADR：docs/frontend-harness

- ブランチ：`docs/frontend-harness`
- 作業の内容：`frontend/` 用のAIへの指示書（`frontend/AGENTS.md`）を作る
- 進捗表のID：
- 期間：2026-11-17
- 記録した者：Claude Code

---

## 判断：指示書は frontend/AGENTS.md に置き、frontend/CLAUDE.md から読み込む

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

フロント用の指示書の置き場所が決まっていなかった。

### 決めたこと

ルートと同じ形にした。本文は `frontend/AGENTS.md`、`frontend/CLAUDE.md` は `@AGENTS.md` で読み込むだけ。ルートの AGENTS.md の「仕様」に、`frontend/AGENTS.md` を読むよう1行足した。

### 理由

Claude Code は `frontend/` のファイルを触るときに `frontend/CLAUDE.md` を自動で読み、Codex などは `frontend/AGENTS.md` を読む。ルートと同じ形なので迷わない。

### ほかの案

- ルートの AGENTS.md に全部書く：バックエンドの作業でも毎回読まれて長くなる

### 影響・あとで見直すこと

なし

## 判断：「基本コンポーネント」と「ページ」の分け方を具体的に決めた

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

指示は「shadcn/ui を使う」「Tailwind CSS を使う」「基本コンポーネントを作り、その組み合わせでページを作る」。どこまでを基本コンポーネントとし、ページに何を書いてよいかは決まっていなかった。

### 決めたこと

- フォルダ：`src/components/ui/`（shadcn/ui）、`src/components/`（基本コンポーネント）、`src/pages/`（ページ）
- 基本コンポーネントは見た目だけ（props で受け取り、`onXxx` で知らせる。API を呼ばない）。ストーリーを必ず作る
- ページは `@/components/ui/*` を直接使わない。Tailwind のクラスは並べ方（flex・grid・余白）だけ
- 色は shadcn/ui の色の名前（`bg-primary` など）を使い、値を直接書かない
- `.css` ファイルの追加、`style={{}}`、ほかのUIライブラリは禁止

### 理由

- 基本コンポーネントが API を呼ばなければ、Storybook でそのまま表示・確認できる
- ページが部品を直接使えると、「基本コンポーネントを作る」が守られなくなる
- 色の名前を使えば、デザインを決めたときに `src/index.css` を変えるだけで全体が変わる

### ほかの案

- ページから shadcn/ui の部品を直接使ってもよいことにする：小さな画面は早く作れるが、同じ見た目の部品があちこちに散らばる

### 影響・あとで見直すこと

- 今は文書で守らせるだけ。破られることが多ければ、oxlint の `no-restricted-imports` などで機械的にチェックする
- 締切前で窮屈すぎると感じたら、ルールを緩める

## 判断：今の仮の画面をルールに合わせて分けた

- 状態：提案（人の確認待ち）

### 状況（何に迷ったか）

`src/App.tsx` が shadcn/ui の部品を直接使っていて、新しいルールに合わない。AIは既存のコードを真似するので、そのままだとルール違反が広がる。

### 決めたこと

`src/components/ApiCheckCard.tsx`（基本コンポーネント＋ストーリー）と `src/pages/HomePage.tsx`（ページ）に分けた。`App.tsx` は `HomePage` を表示するだけ。動きは変えていない。

### 理由

ルールの手本になるコードを1つ置いておくため。指示書の例もこのコードを使っている。

### ほかの案

- そのままにする：ルール違反の手本が残る

### 影響・あとで見直すこと

地図やログインの画面を作ったら、`HomePage` と `ApiCheckCard` は置き換える
