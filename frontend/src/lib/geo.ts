// 半径100mの円。地図上の説明用で、保存する位置の計算はサーバーが行う。
export function circleRing(lat: number, lng: number, radiusM = 100): [number, number][] {
  const ring: [number, number][] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dLat = (radiusM / 111_320) * Math.cos(angle);
    const dLng = (radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    ring.push([lng + dLng, lat + dLat]);
  }
  return ring;
}

export function inJapan(lat: number, lng: number): boolean {
  return lat >= 20 && lat <= 46 && lng >= 122 && lng <= 154;
}

export const TOKYO_STATION = { lat: 35.681236, lng: 139.767125 };
