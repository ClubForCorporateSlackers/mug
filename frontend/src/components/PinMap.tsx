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
// 最初は代々木公園あたりを表示する（現在地が取れたら focus で移動する）。
// ズーム13なら表示範囲が0.5度より狭いので、すぐにピンが出る
const INITIAL_CENTER: [number, number] = [139.6949, 35.6717];
const INITIAL_ZOOM = 13;
// focus で移動するときのズーム（これより拡大していたらそのまま）
const FOCUS_ZOOM = 14;

setWorkerUrl(workerUrl);

// 地図を移動させたい場所。seq を変えると、同じ場所でももう一度移動する
export type MapFocus = { lat: number; lng: number; seq: number };

type Props = {
  pins: Pin[];
  selectedPinId: string | null;
  // ここへ地図を移動する（現在地など）。null なら動かさない
  focus?: MapFocus | null;
  // 表示範囲が変わったとき（最初の表示も含む）
  onBoundsChange: (bounds: Bounds) => void;
  // ピンを押したとき。地図の何もないところを押したら null
  onSelectPin: (pin: Pin | null) => void;
  // 利用者が地図を動かし始めたとき（ドラッグ、拡大・縮小など）。focus での移動では呼ばない
  onUserMove?: () => void;
  className?: string;
};

// 地図を表示し、ピンを置く。API は呼ばない（データは props で受け取る）
export function PinMap({
  pins,
  selectedPinId,
  focus = null,
  onBoundsChange,
  onSelectPin,
  onUserMove,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // 最新の関数を地図のイベントから呼べるように ref に入れておく
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onSelectPinRef = useRef(onSelectPin);
  const onUserMoveRef = useRef(onUserMove);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onSelectPinRef.current = onSelectPin;
    onUserMoveRef.current = onUserMove;
  });

  // 地図を1回だけ作る
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
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
    // 表示範囲は地図を作った直後から分かるので、地図の画像の読み込み（load）を待たずに知らせる
    report();
    map.on('moveend', report);
    // 利用者の操作（マウス・指・ホイール・＋−ボタン）で動いたときだけ originalEvent が付く。
    // flyTo などプログラムで動かしたときは付かない
    map.on('movestart', (e) => {
      if (e.originalEvent) onUserMoveRef.current?.();
    });
    map.on('click', () => onSelectPinRef.current(null));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // focus が変わったら、その場所へ移動する
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.getZoom(), FOCUS_ZOOM) });
  }, [focus]);

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
