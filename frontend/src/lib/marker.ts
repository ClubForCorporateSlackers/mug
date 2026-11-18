import pinMosquito from '@/assets/pin-mosquito.svg';

// 地図上のピン（Figma の Pin / Mosquito）。MapLibre に渡す DOM なので、クリックはページ側で付ける。
// big は投稿中のピン（Figma の Marker / just posted）
export function createMugMarker(label: string, big = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = big ? 'block h-[78px] w-14' : 'block h-14 w-11 px-0.5';
  button.setAttribute('aria-label', label);
  const image = document.createElement('img');
  image.src = pinMosquito;
  image.alt = '';
  image.className = 'size-full';
  button.append(image);
  return button;
}

// 自分の現在地（青い点と淡い輪）
export function createUserDot(): HTMLDivElement {
  const halo = document.createElement('div');
  halo.className = 'grid size-11 place-items-center rounded-full bg-location/20';
  halo.setAttribute('aria-label', '現在地');
  const dot = document.createElement('div');
  dot.className = 'size-[18px] rounded-full border-[3px] border-card bg-location';
  halo.append(dot);
  return halo;
}

// CSS の色の設定（index.css）を地図の線や塗りに使う
export function themeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}
