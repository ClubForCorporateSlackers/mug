import { randomInt } from 'node:crypto';
import { type Place, radiusOf } from '../seed.config.ts';

// 位置の計算。サーバー（infra/lambda/api/geo.ts・pin-id.ts）と同じ計算を、依存を増やさないよう写して使う。

const EARTH_RADIUS_M = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

// 0以上1未満の乱数
export function rand(): number {
  return randomInt(0, 2 ** 47) / 2 ** 47; // randomInt の幅は 2^48 未満まで
}

// 北へ north m、東へ east m 動かした位置
function offset(lat: number, lng: number, north: number, east: number) {
  return {
    lat: lat + toDeg(north / EARTH_RADIUS_M),
    lng: lng + toDeg(east / (EARTH_RADIUS_M * Math.cos(toRad(lat)))),
  };
}

// 場所の中にランダムな点を1つ作る（送る前の位置。サーバーがさらに100mずらす）
export function randomPointIn(p: Place): { lat: number; lng: number } {
  let pt: { lat: number; lng: number };
  if (p.kind === 'area') {
    // 距離＝半径×乱数（√を付けない）なので、中心に寄る。密集して見せるため（seed.config.ts）
    const d = radiusOf(p) * rand();
    const a = 2 * Math.PI * rand();
    pt = offset(p.lat, p.lng, d * Math.cos(a), d * Math.sin(a));
  } else {
    // 線に沿った位置を選び、線と直角の向きに ±widthM ずらす
    const t = rand();
    const [lat1, lng1] = p.from;
    const [lat2, lng2] = p.to;
    const base = { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
    const north = toRad(lat2 - lat1) * EARTH_RADIUS_M;
    const east = toRad(lng2 - lng1) * EARTH_RADIUS_M * Math.cos(toRad(base.lat));
    const len = Math.hypot(north, east) || 1;
    const side = (rand() * 2 - 1) * p.widthM;
    pt = offset(base.lat, base.lng, (-east / len) * side, (north / len) * side);
  }
  return { lat: Math.round(pt.lat * 1e6) / 1e6, lng: Math.round(pt.lng * 1e6) / 1e6 };
}

// 場所を囲む範囲（片付けで、その範囲の cell を探すのに使う）。サーバーのずらし100mと余裕を足す
export function boundsOf(p: Place, marginM = 300) {
  const pts = p.kind === 'area' ? [[p.lat, p.lng]] : [p.from, p.to];
  const extra = (p.kind === 'area' ? radiusOf(p) : p.widthM) + marginM;
  const lats = pts.map((x) => x[0]);
  const lngs = pts.map((x) => x[1]);
  const sw = offset(Math.min(...lats), Math.min(...lngs), -extra, -extra);
  const ne = offset(Math.max(...lats), Math.max(...lngs), extra, extra);
  return { minLat: sw.lat, minLng: sw.lng, maxLat: ne.lat, maxLng: ne.lng };
}

// ---- geohash（4文字。infra/lambda/api/geo.ts と同じ）----
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
export const GEOHASH_PRECISION = 4;

export function encodeGeohash(lat: number, lng: number, precision = GEOHASH_PRECISION): string {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { ch = (ch << 1) | 1; lngMin = mid; } else { ch <<= 1; lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latMin = mid; } else { ch <<= 1; latMax = mid; }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

// 範囲にかかる cell（範囲の四隅と、その間を cell の大きさより細かく調べる）
export function cellsForBounds(b: { minLat: number; maxLat: number; minLng: number; maxLng: number }): string[] {
  const cells = new Set<string>();
  const step = 0.05; // 4文字の cell（約0.18度×0.35度）より十分小さい
  for (let lat = b.minLat; lat < b.maxLat + step; lat += step) {
    for (let lng = b.minLng; lng < b.maxLng + step; lng += step) {
      cells.add(encodeGeohash(Math.min(lat, b.maxLat), Math.min(lng, b.maxLng)));
    }
  }
  return [...cells];
}

// ---- pinId（APIの形「cell-ULID」）から Pins のキーを作る（infra/lambda/api/pin-id.ts と同じ）----
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function nowJst(now: Date): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace(/\.\d{3}Z$/, '+09:00');
}

export function pinKeyFromPublicId(publicId: string): { cell: string; sk: string; pinId: string } | undefined {
  const m = /^([0-9b-hjkmnp-z]{1,12})-([0-7][0-9A-HJKMNP-TV-Z]{25})$/.exec(publicId);
  if (!m) return undefined;
  const [, cell, pinId] = m;
  let t = 0;
  for (const ch of pinId.slice(0, 10)) t = t * 32 + CROCKFORD.indexOf(ch);
  return { cell, sk: `${nowJst(new Date(t))}#${pinId}`, pinId };
}
