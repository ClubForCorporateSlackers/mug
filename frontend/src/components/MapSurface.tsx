import type { Ref } from 'react';

type Props = { ref?: Ref<HTMLDivElement>; label: string };

// 地図を描く場所（MapLibre に渡す div）。画面いっぱいに広げ、
// 地図の出典表示（消してはいけない）を「ここで刺された！」と現在地のボタンより上に出す。
// MapLibre は渡した div に position: relative を付けるので、広げるのは外側の div で行う。
// MapLibre の CSS は Tailwind の層の外にあって強いので、出典の位置だけ ! で上書きする
export function MapSurface({ ref, label }: Props) {
  return (
    <div className="absolute inset-0 bg-secondary [&_.maplibregl-ctrl-bottom-left]:bottom-[calc(49px+env(safe-area-inset-bottom)+152px)]!">
      <div ref={ref} role="region" aria-label={label} className="size-full" />
    </div>
  );
}
