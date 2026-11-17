import { randomBytes } from 'node:crypto';

// ULID（作成順に並ぶID、26文字）。docs/api-spec.md の「ID」。小さいので自作した
// 先頭10文字＝作成時刻（ミリ秒）、残り16文字＝乱数80ビット。
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(now: number = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = randomBytes(16);
  let rand = '';
  for (let i = 0; i < 16; i++) rand += CROCKFORD[bytes[i] & 31];
  return time + rand;
}

// ULID の先頭10文字から作成時刻（ミリ秒）を取り出す（ulid() の逆）。形が正しくなければ undefined
export function decodeUlidTime(id: string): number | undefined {
  if (!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(id)) return undefined;
  let t = 0;
  for (const ch of id.slice(0, 10)) t = t * 32 + CROCKFORD.indexOf(ch);
  return t;
}
