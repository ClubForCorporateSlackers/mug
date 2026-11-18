import { createRoot } from 'react-dom/client';
import { HerePin } from '@/components/HerePin';
import { MugMark } from '@/components/MugMark';
import { PostPin } from '@/components/PostPin';

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

// 現在地。蚊のピンの先に青い点。anchor: 'bottom' で置く。
export function createHereMarker(): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'pointer-events-none';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', '現在地');
  createRoot(element).render(<HerePin />);
  return element;
}

// これから立てるピン。anchor: 'bottom' で置く。
export function createPostMarker(label: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'pointer-events-none';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', label);
  createRoot(element).render(<PostPin />);
  return element;
}
