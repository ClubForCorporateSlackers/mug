import type { Pin } from './types';

export type TabName = 'map' | 'ranking' | 'about';

// next は、ログインやプロフィール登録のあとに戻る画面
export type Route =
  | { name: 'splash' }
  | { name: 'locate' }
  | { name: 'login'; next?: Route; notice?: string }
  | { name: 'signup'; next?: Route }
  | { name: 'confirm'; email: string; password: string; next?: Route }
  | { name: 'reset'; next?: Route }
  | { name: 'resetConfirm'; email: string; next?: Route }
  | { name: 'profile'; next?: Route }
  | { name: 'map' }
  | { name: 'pin'; pin: Pin }
  | { name: 'ranking' }
  | { name: 'about' }
  | { name: 'me' };
