import type { BloodType, PinStamp, ReactionType } from './types';

export const BLOOD_OPTIONS: { value: BloodType; label: string }[] = [
  { value: 'A', label: 'A型' },
  { value: 'B', label: 'B型' },
  { value: 'O', label: 'O型' },
  { value: 'AB', label: 'AB型' },
  { value: 'UNKNOWN', label: '答えない' },
];

export const PIN_STAMPS: { value: PinStamp; label: string }[] = [
  { value: 'kayui', label: 'かゆい' },
  { value: 'itai', label: 'いたい' },
];

export const REACTIONS: { value: ReactionType; label: string }[] = [
  { value: 'odaiji', label: 'お大事に' },
  { value: 'kaite', label: '掻いてあげる' },
  { value: 'wakaru', label: 'わかる' },
];

export function stampLabel(stamp: PinStamp | null): string {
  return PIN_STAMPS.find((item) => item.value === stamp)?.label ?? 'スタンプなし';
}

export function bloodLabel(blood: BloodType): string {
  return BLOOD_OPTIONS.find((item) => item.value === blood)?.label ?? blood;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hour}:${minute}`;
}

export function currentMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [yearText, monthText] = month.split('-');
  const date = new Date(Number(yearText), Number(monthText) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [year, mon] = month.split('-');
  return `${year}年${Number(mon)}月`;
}

// 市町村名の先頭から都道府県を取る。「京都」の「都」で切らない。
export function prefectureName(label: string): string | null {
  if (label.startsWith('北海道')) return '北海道';
  if (label.startsWith('東京都')) return '東京都';
  const matched = label.match(/^.+?[府県]/);
  return matched ? matched[0] : null;
}

// 「2時間前」のような表示。1日以上前は日付にする
export function timeAgo(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return formatWhen(iso);
}

// 過去の月（今月から数えて count か月）。ランキングの期間の選択肢に使う
export function recentMonths(count: number, from = currentMonth()): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(from, -index));
}

export const PREFECTURES = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
];
