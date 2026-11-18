import type { Ref } from 'react';

type Props = { ref?: Ref<HTMLDivElement>; label: string };

// 地図を描く場所（MapLibre に渡す div）。画面いっぱいに広げ、
// 地図の出典表示（消してはいけない）は、地図の一番下（下のタブのすぐ上）に出す。
// MapLibre は渡した div に position: relative を付けるので、広げるのは外側の div で行う。
// MapLibre の CSS は Tailwind の層の外にあって強いので、出典の位置だけ ! で上書きする。
// 「ここで刺された！」は、ページの側でこの上に置く
export function MapSurface({ ref, label }: Props) {
  return (
    <div className="absolute inset-0 bg-secondary [&_.maplibregl-ctrl-bottom-left]:bottom-[calc(49px+env(safe-area-inset-bottom))]!">
      <div ref={ref} role="region" aria-label={label} className="size-full" />
    </div>
  );
}
