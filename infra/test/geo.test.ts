import { cellSize, cellsForBounds, encodeGeohash, jitter, secureRandom } from '../lambda/api/geo';
import { cityFromMuniCd, createGsiGeocoder } from '../lambda/api/geocoder';
import { MUNI_TABLE } from '../lambda/api/muni-table';
import { ulid } from '../lambda/api/ulid';

// 位置の計算（ぼかし・geohash）、市町村の判定、ID のテスト。

// 2点の距離（m）。ハバーサインの式
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

describe('jitter（位置のぼかし）', () => {
  const origin = { lat: 35.68123, lng: 139.76712 };

  test('いつも半径100m以内（丸めの分だけ少し余裕を見る）', () => {
    for (let i = 0; i < 2000; i++) {
      expect(distanceM(origin, jitter(origin.lat, origin.lng))).toBeLessThanOrEqual(100.5);
    }
  });

  test('乱数が最大のとき、ほぼ100m動く', () => {
    const p = jitter(origin.lat, origin.lng, () => 0.999999);
    expect(distanceM(origin, p)).toBeGreaterThan(99);
  });

  test('円の中で偏らない：半径50m以内に入るのは約25%（面積の比）', () => {
    const n = 20000;
    let inner = 0;
    for (let i = 0; i < n; i++) if (distanceM(origin, jitter(origin.lat, origin.lng)) <= 50) inner++;
    // ただの「半径×乱数」だと約50%になる
    expect(inner / n).toBeGreaterThan(0.22);
    expect(inner / n).toBeLessThan(0.28);
  });

  test('secureRandom は 0以上1未満', () => {
    for (let i = 0; i < 1000; i++) {
      const x = secureRandom();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('geohash', () => {
  test('よく知られた値と一致する', () => {
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
    expect(encodeGeohash(35.681236, 139.767125, 5)).toBe('xn76u');
  });

  test('4文字のマスは 経度0.35度 × 緯度0.18度', () => {
    expect(cellSize(4).lng).toBeCloseTo(0.3516, 4);
    expect(cellSize(4).lat).toBeCloseTo(0.1758, 4);
  });

  test('範囲内のどの点のマスも cellsForBounds に入っている', () => {
    const b = { minLat: 35.6, maxLat: 36.1, minLng: 139.6, maxLng: 140.1 };
    const cells = new Set(cellsForBounds(b));
    for (let i = 0; i <= 50; i++) {
      for (let j = 0; j <= 50; j++) {
        const lat = b.minLat + ((b.maxLat - b.minLat) * i) / 50;
        const lng = b.minLng + ((b.maxLng - b.minLng) * j) / 50;
        expect(cells.has(encodeGeohash(lat, lng))).toBe(true);
      }
    }
  });

  test('0.5度四方の Query 回数：4文字なら最大12回、5文字だと150回以上（docs/adr の計算）', () => {
    let max4 = 0;
    let max5 = 0;
    for (let k = 0; k < 200; k++) {
      const minLat = 24 + k * 0.103;
      const minLng = 123 + k * 0.137;
      const b = { minLat, maxLat: minLat + 0.5, minLng, maxLng: minLng + 0.5 };
      max4 = Math.max(max4, cellsForBounds(b, 4).length);
      max5 = Math.max(max5, cellsForBounds(b, 5).length);
    }
    expect(max4).toBeLessThanOrEqual(12);
    expect(max5).toBeGreaterThanOrEqual(150);
  });
});

describe('市町村の判定', () => {
  test('変換表：先頭0ありの5桁で引ける', () => {
    expect(MUNI_TABLE['13101']).toBe('東京都千代田区');
    expect(MUNI_TABLE['01101']).toBe('北海道札幌市中央区');
    expect(Object.keys(MUNI_TABLE).every((k) => /^\d{5}$/.test(k))).toBe(true);
  });

  test('muniCd は先頭0があってもなくても同じ市町村になる', () => {
    expect(cityFromMuniCd('01102')).toEqual({ city: '北海道札幌市北区', cityCode: '01102' });
    expect(cityFromMuniCd('1102')).toEqual({ city: '北海道札幌市北区', cityCode: '01102' });
  });

  test('表にない・形が違うコードは不明', () => {
    for (const c of ['99999', '', 'abc', undefined, 13101]) {
      expect(cityFromMuniCd(c)).toEqual({ city: '不明', cityCode: null });
    }
  });

  const fakeFetch = (impl: () => Promise<unknown>) => jest.fn(impl) as unknown as typeof fetch;
  const okJson = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body });

  test('APIの結果を市町村名にする。URL にはずらした位置を入れる', async () => {
    const f = fakeFetch(() => okJson({ results: { muniCd: '13101', lv01Nm: '丸の内一丁目' } }));
    expect(await createGsiGeocoder(f)(35.6812, 139.7671)).toEqual({ city: '東京都千代田区', cityCode: '13101' });
    expect((f as unknown as jest.Mock).mock.calls[0][0]).toContain('lat=35.6812&lon=139.7671');
  });

  test('{}（海上）・HTTPエラー・通信エラー・タイムアウトは不明', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const cases = [
      fakeFetch(() => okJson({})),
      fakeFetch(() => Promise.resolve({ ok: false, status: 503, json: async () => ({}) })),
      fakeFetch(() => Promise.reject(new TypeError('fetch failed'))),
      fakeFetch(() => okJson(null)),
    ];
    for (const f of cases) {
      expect(await createGsiGeocoder(f)(33, 135)).toEqual({ city: '不明', cityCode: null });
    }
    // 本当に待たせて、タイムアウトで打ち切られること
    const slow = ((_: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason)))) as unknown as typeof fetch;
    expect(await createGsiGeocoder(slow, 50)(33, 135)).toEqual({ city: '不明', cityCode: null });
    // ログに座標を出していない
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/\d{2}\.\d|lat=/);
    warn.mockRestore();
  });
});

test('ulid は26文字で、作成順に並ぶ', () => {
  const a = ulid(1_700_000_000_000);
  const b = ulid(1_700_000_000_001);
  expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  expect(a < b).toBe(true);
});
