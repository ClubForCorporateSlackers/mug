// 地図上のピン。MapLibre に渡す DOM なので、部品としてはページ側でクリックを付ける。
export function createMugMarker(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'grid size-10 place-items-center rounded-full bg-card text-foreground';
  button.setAttribute('aria-label', label);
  button.innerHTML =
    '<svg viewBox="0 0 80 96" width="32" height="38" aria-hidden="true"><circle cx="40" cy="42" r="24" class="fill-foreground"/><ellipse cx="31" cy="40" rx="7" ry="9" class="fill-card"/><ellipse cx="49" cy="40" rx="7" ry="9" class="fill-card"/><circle cx="33" cy="42" r="3.5" class="fill-foreground"/><circle cx="51" cy="42" r="3.5" class="fill-foreground"/><path d="M34 54h12L40 86Z" class="fill-primary"/></svg>';
  return button;
}
