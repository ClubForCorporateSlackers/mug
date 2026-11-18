import { EmptyState } from '@/components/EmptyState';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';

type Props = { onBack: () => void; onMap: () => void };

// D2・D3 自分のピン一覧
// TODO(API): 自分のピンを返す API（例：GET /api/me/pins）ができたら、一覧（D2）を出す
export function MyPinsPage({ onBack, onMap }: Props) {
  return (
    <Screen>
      <NavBar backLabel="マイページ" onBack={onBack} title="自分のピン" />
      <div className="flex flex-1 flex-col justify-center pb-24">
        <EmptyState
          title="自分のピンの一覧は準備中です"
          body="ピンは匿名なので、いまは自分のピンを一覧にできません（APIの追加待ち）。"
          actionLabel="マップへ戻る"
          onAction={onMap}
        />
      </div>
    </Screen>
  );
}
