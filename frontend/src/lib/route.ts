import type { Pin } from './types';

// 画面の切り替え。名前の横の記号は Figma のフレーム名（A1 など）

export type TabName = 'map' | 'ranking' | 'about';

export type Route =
  | { name: 'welcome' } // A1
  | { name: 'signup' } // A2
  | { name: 'confirm'; email: string; password: string } // A3
  | { name: 'setup' } // A4 プロフィール登録
  | { name: 'login' } // A5
  | { name: 'forgot' } // A6
  | { name: 'reset'; email: string } // A7
  | { name: 'location' } // A8
  | { name: 'map'; focus?: Pin } // B1〜B10（focus：開くピン。マイページの「自分のピン」から来たとき）
  | { name: 'ranking' } // C1〜C4
  | { name: 'about' } // C5
  | { name: 'me' } // D1・D5・D6
  | { name: 'myPins' } // D2・D3
  | { name: 'editProfile' }; // D4
