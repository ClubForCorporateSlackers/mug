import type { Map } from 'maplibre-gl';
import type { Pin } from '@/lib/types';

// 画面の上で近くにあるピンを1つのかたまりにし、数で危険度を決める（1個：小、2個：中、3個以上：大）
export type DangerLevel = 'low' | 'mid' | 'high';

export const DANGER_LABELS: Record<DangerLevel, string> = { low: '小', mid: '中', high: '大' };

// かたまりの円の半径（画面の px）
export const DANGER_STYLE: Record<DangerLevel, { radius: number }> = {
  low: { radius: 38 },
  mid: { radius: 52 },
  high: { radius: 68 },
};

// 円の色。MapLibre には色の値を渡す必要があるので、index.css の --danger-low・mid・high から読む
// （frontend/AGENTS.md：色の値はコードに直接書かない）
function dangerColor(level: DangerLevel): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--danger-${level}`).trim();
}

// この距離（画面の px）より近いピンを同じかたまりにする
const GROUP_PX = 64;

export type DangerSpot = { lng: number; lat: number; count: number; level: DangerLevel };

export function levelOf(count: number): DangerLevel {
  if (count >= 3) return 'high';
  if (count === 2) return 'mid';
  return 'low';
}

export function groupPins(map: Map, pins: Pin[]): DangerSpot[] {
  const points = pins.map((pin) => ({ pin, at: map.project([pin.lng, pin.lat]) }));
  const used = new Set<number>();
  const spots: DangerSpot[] = [];
  points.forEach((point, i) => {
    if (used.has(i)) return;
    used.add(i);
    const members = [point.pin];
    for (let j = i + 1; j < points.length; j += 1) {
      if (!used.has(j) && point.at.dist(points[j].at) <= GROUP_PX) {
        used.add(j);
        members.push(points[j].pin);
      }
    }
    const lng = members.reduce((sum, pin) => sum + pin.lng, 0) / members.length;
    const lat = members.reduce((sum, pin) => sum + pin.lat, 0) / members.length;
    spots.push({ lng, lat, count: members.length, level: levelOf(members.length) });
  });
  return spots;
}

const ORDER: Record<DangerLevel, number> = { low: 1, mid: 2, high: 3 };

// 画面の真ん中が入っている円のうち、いちばん高い危険度（どの円にも入っていなければ null）
export function dangerAtCenter(map: Map, spots: DangerSpot[]): DangerLevel | null {
  const center = map.project(map.getCenter());
  let best: DangerLevel | null = null;
  for (const spot of spots) {
    const inside = map.project([spot.lng, spot.lat]).dist(center) <= DANGER_STYLE[spot.level].radius;
    if (inside && (!best || ORDER[spot.level] > ORDER[best])) best = spot.level;
  }
  return best;
}

export function spotsData(spots: DangerSpot[]) {
  return {
    type: 'FeatureCollection' as const,
    features: spots.map((spot) => ({
      type: 'Feature' as const,
      properties: { radius: DANGER_STYLE[spot.level].radius, color: dangerColor(spot.level) },
      geometry: { type: 'Point' as const, coordinates: [spot.lng, spot.lat] },
    })),
  };
}
