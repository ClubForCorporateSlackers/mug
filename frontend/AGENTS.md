# frontend/AGENTS.md

`frontend/`（画面）で作業するAIへの指示書です。リポジトリ全体のルール（ルートの AGENTS.md）に加えて、ここに書いたことを必ず守ってください。

## 3つの約束

1. **UI部品は shadcn/ui を使う**
2. **見た目は Tailwind CSS のクラスで書く**
3. **基本コンポーネントを作り、ページはその組み合わせで作る**

守れない事情があるときは、実装を進める前に人間に確認してください。

## 1. UI部品は shadcn/ui を使う

- ボタン、入力欄、ダイアログなどの部品は、まず shadcn/ui にあるかを調べる。あれば `npx shadcn@latest add <名前>` で `src/components/ui/` に追加する（例：`npx shadcn@latest add dialog input`）。追加したら `npm run format` を実行する
- shadcn/ui にある部品を自分で一から書かない
- ほかのUIライブラリ（MUI、Chakra UI、Ant Design など）を入れない
- アイコンは `lucide-react` を使う（shadcn/ui の設定と同じ）
- `src/components/ui/` のファイルは shadcn/ui が作ったものなので、なるべく書き換えない。見た目を変えたいときは、使う側で `className` や `variant` を渡す

## 2. 見た目は Tailwind CSS のクラスで書く

- スタイルは JSX の `className` に Tailwind CSS のクラスで書く
- 新しい `.css` ファイル、CSS Modules、`style={{ ... }}`、CSS-in-JS（styled-components など）は使わない。CSSファイルは `src/index.css`（Tailwind と shadcn/ui の色の設定）だけ
- 色は shadcn/ui の色の名前を使う。色の値を直接書かない
  - よい例：`bg-primary`、`text-muted-foreground`、`border-border`
  - 悪い例：`bg-[#e11d48]`、`text-red-500`
- 条件によってクラスを変えるときは `cn()`（`@/lib/utils`）を使う
  - 例：`className={cn('rounded-md p-2', selected && 'bg-accent')}`

## 3. 基本コンポーネントを作り、ページはその組み合わせで作る

### フォルダと役割

| フォルダ             | 置くもの                                                                   | 例                               | 使ってよいもの                                    |
| -------------------- | -------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `src/components/ui/` | shadcn/ui の部品（コマンドで追加したもの）                                 | `button.tsx`、`card.tsx`         | —                                                 |
| `src/components/`    | **基本コンポーネント**：アプリ用の部品。shadcn/ui の部品を組み合わせて作る | `PinCard.tsx`、`StampButton.tsx` | `@/components/ui/*`、ほかの基本コンポーネント     |
| `src/pages/`         | **ページ**：基本コンポーネントを並べて画面を作る                           | `HomePage.tsx`、`MapPage.tsx`    | `@/components/*`（基本コンポーネント）、`@/lib/*` |

### 基本コンポーネントのルール

- **見た目だけを担当する**。表示するデータは props で受け取り、操作は `onXxx` の props で親に知らせる。API を呼ばない、ページの状態を持たない
  - 例：`<PinCard memo="公園のベンチ" createdAt="5分前" onStamp={(type) => ...} />`
- 1ファイルに1つのコンポーネント。ファイル名とコンポーネント名は同じパスカルケースにする（`PinCard.tsx` → `export function PinCard`）
- **ストーリーを必ず作る**。同じフォルダに `PinCard.stories.tsx` を置き、代表的な状態（通常、空、エラー、読み込み中など）を並べる

### ページのルール

- **ページから `@/components/ui/*` を直接使わない**。必要な部品は、まず基本コンポーネントとして `src/components/` に作ってからページで使う
- ページでやってよいこと：API を呼ぶ（`@/lib/api`）、状態を持つ、基本コンポーネントを並べる
- ページで書いてよい Tailwind のクラスは、並べ方（`flex`、`grid`、`gap-*`、`p-*`、`min-h-svh` など）だけ。色や角の丸みなどの見た目は基本コンポーネントの中に書く

### 例：今の画面（`src/pages/HomePage.tsx`）

```tsx
// ページ：状態と API 呼び出しを持ち、基本コンポーネントを並べるだけ
export function HomePage() {
  const [result, setResult] = useState('まだ確認していません');
  async function checkApi() {
    /* api('GET', '/api/hello') を呼んで setResult */
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <ApiCheckCard result={result} onCheck={checkApi} />
    </main>
  );
}
```

`ApiCheckCard`（`src/components/ApiCheckCard.tsx`）が基本コンポーネントで、中で shadcn/ui の `Card` と `Button` を使っています。

## API の呼び方

- API は必ず `@/lib/api` の `api()` で呼ぶ。`fetch` を直接書かない（ルートの AGENTS.md の約束2・3・5を守るため）
- API の形は docs/api-spec.md を見る

## 作業が終わったら（CI と同じ確認）

`frontend/` で次を実行し、すべて通ることを確かめる。

```bash
npm run format        # 整形（CI では format:check）
npm run lint
npm run build         # 型チェックも含む
npm run build-storybook
```

画面の見た目は、PR に付くプレビューURLと Storybook（`<プレビューURL>/storybook/`）で確認できる。
