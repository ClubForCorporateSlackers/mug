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
};
