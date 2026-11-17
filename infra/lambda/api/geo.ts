import { randomBytes } from 'node:crypto';

// 位置の計算の部品（ぼかし・geohash）。外の世界にはつながない。

// 0以上1未満の乱数を返す関数の型。テストでは決まった値を返すものに差し替える
export type Random = () => number;

// 予測されにくい乱数（Math.random より安全）。53ビットの整数を 2^53 で割って 0〜1 にする
export const secureRandom: Random = () => {
  const b = randomBytes(8);
  const n = (b.readUInt32BE(0) & 0x1fffff) * 2 ** 32 + b.readUInt32BE(4); // 上位21ビット＋下位32ビット
  return n / 2 ** 53;
};

const EARTH_RADIUS_M = 6_371_000;
export const JITTER_RADIUS_M = 100;

// 位置を半径100mの円の中でランダムにずらす（docs/decisions.md #9）。
// 円の中で偏らないように、距離は「半径 × √乱数」にする（ただの「半径 × 乱数」だと中心に集まる）。
// 元の座標はこの関数の外に持ち出さない（保存・ログ出力・返却しない）。
export function jitter(lat: number, lng: number, random: Random = secureRandom): { lat: number; lng: number } {
  const distance = JITTER_RADIUS_M * Math.sqrt(random());
  const angle = 2 * Math.PI * random();
  const north = distance * Math.cos(angle); // 北へ何m
  const east = distance * Math.sin(angle); // 東へ何m
  const toDeg = 180 / Math.PI;
  const newLat = lat + (north / EARTH_RADIUS_M) * toDeg;
  const newLng = lng + (east / (EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180))) * toDeg;
  // 小数6桁（約0.1m）に丸める。見た目を整えるためで、ぼかしの大きさはほぼ変わらない
  return { lat: round6(newLat), lng: round6(newLng) };
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

// ---- geohash ----
// Pins テーブルのパーティションキー（cell）。文字数は docs/adr/feature-api-pins.md の計算で 4 にした
// （4文字 ＝ 経度0.35度 × 緯度0.18度。日本付近で約32km × 20km）。
export const GEOHASH_PRECISION = 4;

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

// 1文字＝5ビット。ビットは経度・緯度の順に交互に使う
function bitsFor(precision: number) {
  const total = precision * 5;
  return { lngBits: Math.ceil(total / 2), latBits: Math.floor(total / 2) };
}

export function encodeGeohash(lat: number, lng: number, precision = GEOHASH_PRECISION): string {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true; // true のとき経度のビット
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

// 1つのマス（cell）の大きさ（度）
export function cellSize(precision = GEOHASH_PRECISION): { lat: number; lng: number } {
  const { latBits, lngBits } = bitsFor(precision);
  return { lat: 180 / 2 ** latBits, lng: 360 / 2 ** lngBits };
}

export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// 表示範囲にかかるマスを全部挙げる。マスの番号を数えて、各マスの中心の geohash を求める
export function cellsForBounds(b: Bounds, precision = GEOHASH_PRECISION): string[] {
  const size = cellSize(precision);
  const { latBits, lngBits } = bitsFor(precision);
  const index = (v: number, min: number, step: number, count: number) =>
    Math.min(Math.floor((v - min) / step), count - 1); // 90度・180度ちょうどは最後のマスに入れる
  const lat0 = index(b.minLat, -90, size.lat, 2 ** latBits);
  const lat1 = index(b.maxLat, -90, size.lat, 2 ** latBits);
  const lng0 = index(b.minLng, -180, size.lng, 2 ** lngBits);
  const lng1 = index(b.maxLng, -180, size.lng, 2 ** lngBits);
  const cells: string[] = [];
  for (let i = lat0; i <= lat1; i++) {
    for (let j = lng0; j <= lng1; j++) {
      cells.push(encodeGeohash(-90 + (i + 0.5) * size.lat, -180 + (j + 0.5) * size.lng, precision));
    }
  }
  return cells;
}
