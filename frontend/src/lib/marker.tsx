import { createRoot } from 'react-dom/client';
import { MugMark } from '@/components/MugMark';

// MapLibre に渡す DOM。蚊の口の先（下の端）が地点を指すので、Marker は anchor: 'bottom' で置く。

// 投稿されたピン。クリックはページ側で付ける。
export function createMugMarker(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block h-12 w-9 cursor-pointer';
  button.setAttribute('aria-label', label);
  createRoot(button).render(<MugMark className="size-full drop-shadow" decorative />);
  return button;
}

// これからピンを立てる場所（現在地・投稿中の場所）。
export function createHereMarker(label: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'pointer-events-none relative h-16 w-12';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', label);
  createRoot(element).render(
    <>
      <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 animate-ping rounded-full bg-primary" />
      <MugMark className="relative size-full drop-shadow-lg" decorative />
    </>,
  );
  return element;
}
