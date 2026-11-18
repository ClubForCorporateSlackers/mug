// API が返す形（docs/api-spec.md）。画面のコードはこの型でデータを受け渡す。

// 4. GET /api/pins の1件分。pinId は中身を解釈せず、そのまま使う
export type Pin = {
  pinId: string;
  lat: number;
  lng: number;
  city: string;
  stamp: PinStamp | null;
  memo: string;
  createdAt: string;
  commentCount: number;
  reactions: Partial<Record<ReactionType, number>>;
};

export type PinsResponse = { pins: Pin[]; truncated: boolean };

// 5. スタンプの種類
export type PinStamp = 'kayui' | 'itai';
export type ReactionType = 'odaiji' | 'kaite' | 'wakaru';

export const PIN_STAMP_LABEL: Record<PinStamp, string> = { kayui: 'かゆい', itai: 'いたい' };
export const REACTION_TYPES: ReactionType[] = ['odaiji', 'kaite', 'wakaru'];
export const REACTION_LABEL: Record<ReactionType, string> = {
  odaiji: 'お大事に',
  kaite: '掻いてあげる',
  wakaru: 'わかる',
};

// 9. GET /api/rankings
export type RankingType = 'user' | 'city' | 'blood';
export type RankingItem = { rank: number; label: string; count: number };
export type RankingResponse = { type: RankingType; month: string; items: RankingItem[] };

// 地図の表示範囲（緯度・経度）
export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };
