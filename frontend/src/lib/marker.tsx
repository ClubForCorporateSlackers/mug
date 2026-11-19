import { createRoot } from 'react-dom/client';
import { HereDot } from '@/components/HereDot';
import { MugMark } from '@/components/MugMark';
// MapLibre に渡す DOM。蚊のピンは口の先（下の端）が地点なので anchor: 'bottom' で置く。

// 投稿されたピン。クリックはページ側で付ける。
export function createMugMarker(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block h-12 w-9 cursor-pointer';
  button.setAttribute('aria-label', label);
  createRoot(button).render(<MugMark className="size-full drop-shadow" decorative />);
  return button;
}

// 現在地。青い丸（中心が地点）。anchor: 'center' で置く。
// 蚊のピンは地図の真ん中に固定する CenterPin だけにする（現在地にも蚊を出すと、地図を動かしたときに2匹に見える）
export function createHereMarker(): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'pointer-events-none';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', '現在地');
  createRoot(element).render(<HereDot />);
  return element;
}
