// docs/api-spec.md の返す形

export type BloodType = 'A' | 'B' | 'O' | 'AB' | 'UNKNOWN';
export type PinStamp = 'kayui' | 'itai';
export type ReactionType = 'odaiji' | 'kaite' | 'wakaru';
export type RankType = 'user' | 'city' | 'blood';

export type Profile = {
  userId: string;
  nickname: string;
  bloodType: BloodType;
  pinCount: number;
  // 追加予定（docs/api-spec.md の 8）
  monthCount?: number;
  odaijiReceived?: number;
};

export type Pin = {
  pinId: string;
  lat: number;
  lng: number;
  city: string;
  stamp: PinStamp | null;
  memo: string;
  createdAt: string;
  commentCount?: number;
  reactions?: Partial<Record<ReactionType, number>>;
};

export type Comment = {
  commentId: string;
  nickname: string;
  text: string;
  createdAt: string;
};

export type RankItem = {
  rank: number;
  label: string;
  count: number;
  // 追加予定：type=blood のときの1人あたりの回数
  average?: number;
};

export type RiskLevel = 'high' | 'mid' | 'low';

// 追加予定：GET /api/area（docs/api-spec.md の #14）
export type Area = {
  city: string | null;
  prefecture: string | null;
  monthCount: number;
  risk: RiskLevel | null;
  prefectureRank: number | null;
  diffFromLastMonth: number;
};

// 追加予定：GET /api/risk-areas（#15）
export type RiskArea = { lat: number; lng: number; radiusM: number; risk: RiskLevel };
