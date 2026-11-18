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
