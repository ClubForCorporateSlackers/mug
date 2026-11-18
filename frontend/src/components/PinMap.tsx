import { useEffect, useRef } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// maplibre-gl v6 は地図の処理を別ファイルの Worker で行う。Vite はそのファイルを自動では
// ビルドに入れないので、?url で同梱して場所を教える（これがないと道路や地名が出ない）
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { Bounds, Pin } from '@/lib/api-types';
import { PIN_STAMP_LABEL } from '@/lib/api-types';
import { cn } from '@/lib/utils';

// OpenFreeMap（キー不要）。出典表示は MapLibre が右下に出すので消さない
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
// 最初は日本全体を表示する
const JAPAN_CENTER: [number, number] = [137.5, 37.5];
const JAPAN_ZOOM = 4.3;

setWorkerUrl(workerUrl);

type Props = {
  pins: Pin[];
  selectedPinId: string | null;
  // 表示範囲が変わったとき（最初の表示も含む）
  onBoundsChange: (bounds: Bounds) => void;
  // ピンを押したとき。地図の何もないところを押したら null
  onSelectPin: (pin: Pin | null) => void;
  className?: string;
};

// 地図を表示し、ピンを置く。API は呼ばない（データは props で受け取る）
export function PinMap({ pins, selectedPinId, onBoundsChange, onSelectPin, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // 最新の関数を地図のイベントから呼べるように ref に入れておく
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onSelectPinRef = useRef(onSelectPin);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onSelectPinRef.current = onSelectPin;
  });

  // 地図を1回だけ作る
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: JAPAN_CENTER,
      zoom: JAPAN_ZOOM,
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    const report = () => {
      const b = map.getBounds();
      onBoundsChangeRef.current({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
    };
    map.on('load', report);
    map.on('moveend', report);
    map.on('click', () => onSelectPinRef.current(null));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ピンを置き直す
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = pins.map((pin) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', pin.stamp ? `ピン（${PIN_STAMP_LABEL[pin.stamp]}）` : 'ピン');
      el.className = cn(
        'size-4 cursor-pointer rounded-full border-2 border-background shadow-md transition-transform',
        pin.stamp === 'kayui' && 'bg-destructive',
        pin.stamp === 'itai' && 'bg-chart-4',
        pin.stamp === null && 'bg-muted-foreground',
        pin.pinId === selectedPinId && 'scale-150 ring-2 ring-ring',
      );
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // 地図の click（選択を外す）に伝えない
        onSelectPinRef.current(pin);
      });
      return new Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map);
    });
    return () => markers.forEach((m) => m.remove());
  }, [pins, selectedPinId]);

  return <div ref={containerRef} className={cn('h-full w-full', className)} />;
}
