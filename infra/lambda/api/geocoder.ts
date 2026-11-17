import { MUNI_TABLE } from './muni-table';

// 国土地理院の逆ジオコーディングAPIで、位置から市町村を判定する（docs/decisions.md #22）。
// 外部利用の保証がないAPIなので、失敗しても投稿は止めない（不明として扱う）。

export type City = { city: string; cityCode: string | null };
export type ReverseGeocode = (lat: number, lng: number) => Promise<City>;

export const UNKNOWN_CITY: City = { city: '不明', cityCode: null };
const ENDPOINT = 'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress';
export const GEOCODE_TIMEOUT_MS = 2000;

// muniCd（例 "01102" や "1102"）を5桁にそろえて変換表で名前にする。表にない・形が違うときは不明
export function cityFromMuniCd(muniCd: unknown): City {
  if (typeof muniCd !== 'string' || !/^\d{4,5}$/.test(muniCd)) return UNKNOWN_CITY;
  const code = muniCd.padStart(5, '0');
  const name = MUNI_TABLE[code];
  return name ? { city: name, cityCode: code } : UNKNOWN_CITY;
}

// fetch は差し替えられるようにしておく（テストで本物のAPIを呼ばないため）
export function createGsiGeocoder(fetchFn: typeof fetch = fetch, timeoutMs = GEOCODE_TIMEOUT_MS): ReverseGeocode {
  return async (lat, lng) => {
    try {
      const url = `${ENDPOINT}?lat=${lat}&lon=${lng}`;
      const res = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { results?: { muniCd?: unknown } };
      // 海上などでは {} が返る
      return cityFromMuniCd(body?.results?.muniCd);
    } catch (e) {
      // 位置（URL）はログに出さない。エラーの種類だけ
      console.warn('reverse geocode failed:', e instanceof Error ? e.name : 'unknown');
      return UNKNOWN_CITY;
    }
  };
}
