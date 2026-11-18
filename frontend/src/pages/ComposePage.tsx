import { useEffect, useRef, useState } from 'react';
import '@/lib/map-worker';
import { AttributionControl, GeoJSONSource, Map, Marker } from 'maplibre-gl';
import { Move, X } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';
import { MugMemo } from '@/components/MugMemo';
import { StampPicker } from '@/components/StampPicker';
import { api } from '@/lib/api';
import { circleRing, inJapan } from '@/lib/geo';
import type { LatLng } from '@/lib/location';
import { createMugMarker } from '@/lib/marker';
import type { Pin, PinStamp } from '@/lib/types';

type Props = {
  idToken: string;
  start: LatLng;
  onBack: () => void;
  onPosted: (pin: Pin) => void;
};

function circleData(point: LatLng) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [circleRing(point.lat, point.lng)] },
  };
}

export function ComposePage({ idToken, start, onBack, onPosted }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const startRef = useRef(start);
  const [point, setPoint] = useState(start);
  const [adjusting, setAdjusting] = useState(false);
  const [stamp, setStamp] = useState<PinStamp | null>(null);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const origin = startRef.current;
    const map = new Map({
      container: element,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [origin.lng, origin.lat],
      zoom: 16,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    mapRef.current = map;
    markerRef.current = new Marker({ element: createMugMarker('刺された場所'), anchor: 'bottom' })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);

    map.on('load', () => {
      map.addSource('blur', { type: 'geojson', data: circleData(origin) });
      map.addLayer({
        id: 'blur-fill',
        type: 'fill',
        source: 'blur',
        paint: { 'fill-color': '#c23b3b', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'blur-line',
        type: 'line',
        source: 'blur',
        paint: { 'line-color': '#c23b3b', 'line-width': 2, 'line-dasharray': [2, 2] },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    markerRef.current?.setLngLat([point.lng, point.lat]);
    (map?.getSource('blur') as GeoJSONSource | undefined)?.setData(circleData(point));
  }, [point]);

  useEffect(() => {
    const map = mapRef.current;
    const element = markerRef.current?.getElement();
    if (element) element.hidden = adjusting;
    if (map?.getLayer('blur-fill')) {
      const visibility = adjusting ? 'none' : 'visible';
      map.setLayoutProperty('blur-fill', 'visibility', visibility);
      map.setLayoutProperty('blur-line', 'visibility', visibility);
    }
  }, [adjusting]);

  function startAdjust() {
    mapRef.current?.easeTo({ center: [point.lng, point.lat] });
    setAdjusting(true);
  }

  function finishAdjust() {
    const center = mapRef.current?.getCenter();
    if (center) setPoint({ lat: center.lat, lng: center.lng });
    setAdjusting(false);
  }

  function cancelAdjust() {
    mapRef.current?.easeTo({ center: [point.lng, point.lat] });
    setAdjusting(false);
  }

  async function submit() {
    if (!inJapan(point.lat, point.lng)) {
      setError('日本の範囲の中で場所を選んでください');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const pin = await api<Pin>('POST', '/api/pins', {
        idToken,
        body: { lat: point.lat, lng: point.lng, stamp, memo: memo.trim() },
      });
      onPosted(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿できませんでした');
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    if (memo.trim() || stamp) setConfirmLeave(true);
    else onBack();
  }

  return (
    <main className="flex h-svh flex-col">
      <div className="relative min-h-0 flex-1">
        <div ref={holder} className="h-full w-full" />
        {adjusting ? (
          <>
            <p className="absolute inset-x-3 top-3 flex items-center gap-2 rounded-2xl bg-card px-3 py-3 text-sm font-bold">
              <Move className="size-5 shrink-0" aria-hidden />
              地図を動かして、刺された場所にピンを合わせてください
            </p>
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
              <MugMark className="size-16" decorative />
            </div>
          </>
        ) : null}
      </div>
      {adjusting ? (
        <section className="rounded-t-3xl bg-card px-4 pt-4 pb-6" aria-label="ピンの位置を調整">
          <p className="text-center text-xs">公開されるときは、ここから半径100m以内でぼかされます。</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MugButton variant="secondary" onClick={cancelAdjust}>
              キャンセル
            </MugButton>
            <MugButton onClick={finishAdjust}>この位置にする</MugButton>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-t-3xl bg-card px-4 pt-4 pb-6" aria-label="ピンを立てる">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h1 className="text-lg font-bold">ここで刺された</h1>
              <p className="text-xs">位置は半径100m以内でぼかして公開されます。メモも匿名です。</p>
            </div>
            <button type="button" className="grid size-9 place-items-center" aria-label="やめる" onClick={leave}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">スタンプ（任意）</p>
            <StampPicker value={stamp} onChange={setStamp} />
          </div>
          <MugMemo
            label="ひとこと（任意）"
            maxLength={100}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
          <button
            type="button"
            className="flex items-center gap-2 self-start text-sm font-bold text-primary"
            onClick={startAdjust}
          >
            <Move className="size-4" aria-hidden />
            ピンの位置を調整
          </button>
          {error ? <AppNotice tone="error">{error}</AppNotice> : null}
          <div className="grid grid-cols-2 gap-2">
            <MugButton variant="secondary" onClick={leave}>
              やめる
            </MugButton>
            <MugButton onClick={() => void submit()} disabled={busy}>
              {busy ? '投稿中' : '投稿する'}
            </MugButton>
          </div>
        </section>
      )}
      {confirmLeave ? (
        <ConfirmSheet
          title="投稿をやめますか？"
          body="選んだスタンプとひとことは消えます。"
          confirmLabel="やめる"
          cancelLabel="続ける"
          onConfirm={onBack}
          onCancel={() => setConfirmLeave(false)}
        />
      ) : null}
    </main>
  );
}
