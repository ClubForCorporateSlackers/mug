import { nowJst } from './http';
import { decodeUlidTime } from './ulid';

// APIで見せる pinId（例：xn76-01JD…）と、Pins テーブルのキー（cell・sk）の変換。
// Pins のキーは cell と sk（日時#ULID）なので、ULID だけでは GetItem・UpdateItem ができない。
// そこで、APIで見せる pinId に cell を含める（docs/adr/feature-api-social.md）。
// - sk の日時は、ULID の先頭（作成時刻）から計算し直せる（createPin が同じ時刻から両方を作るため）
// - DB の中（Pins の pinId 属性、Comments・Reactions のキー）は ULID のまま

export type PinKey = {
  cell: string; // Pins のパーティションキー
  sk: string; // Pins のソートキー（日時#ULID）
  pinId: string; // ULID（Comments・Reactions のキー）
};

export function toPublicPinId(cell: string, pinId: string): string {
  return `${cell}-${pinId}`;
}

// 形が正しくなければ undefined（呼ぶ側で 404 にする）
export function parsePublicPinId(publicId: string): PinKey | undefined {
  const m = /^([0-9b-hjkmnp-z]{1,12})-([0-9A-HJKMNP-TV-Z]{26})$/.exec(publicId);
  if (!m) return undefined;
  const [, cell, pinId] = m;
  const time = decodeUlidTime(pinId);
  if (time === undefined) return undefined;
  return { cell, sk: `${nowJst(new Date(time))}#${pinId}`, pinId };
}
