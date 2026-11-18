import { useEffect, useRef, useState, type FormEvent } from 'react';
import '@/lib/map-worker';
import { AttributionControl, GeoJSONSource, Map, Marker } from 'maplibre-gl';
import { AppNotice } from '@/components/AppNotice';
import { MugButton } from '@/components/MugButton';
import { MugMemo } from '@/components/MugMemo';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StampPicker } from '@/components/StampPicker';
import { api } from '@/lib/api';
import { TOKYO_STATION, circleRing, inJapan } from '@/lib/geo';
import { createMugMarker } from '@/lib/marker';
import type { Pin, PinStamp } from '@/lib/types';

type Props = {
  idToken: string;
  onBack: () => void;
  onPosted: (pin: Pin) => void;
};

export function ComposePage({ idToken, onBack, onPosted }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [point, setPoint] = useState(TOKYO_STATION);
  const [stamp, setStamp] = useState<PinStamp | null>(null);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const start = useRef(point);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const origin = start.current;
    const map = new Map({
      container: element,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [origin.lng, origin.lat],
      zoom: 16,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    mapRef.current = map;
    const button = createMugMarker('公開位置の目安');
    const marker = new Marker({ element: button, anchor: 'bottom', draggable: true })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);
    marker.on('dragend', () => {
      const next = marker.getLngLat();
      setPoint({ lat: next.lat, lng: next.lng });
    });

    const drawCircle = (lat: number, lng: number) => {
      const data = {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [circleRing(lat, lng)] },
      };
      const source = map.getSource('blur') as GeoJSONSource | undefined;
      if (source) source.setData(data);
      else {
        map.addSource('blur', { type: 'geojson', data });
        map.addLayer({
          id: 'blur-fill',
          type: 'fill',
          source: 'blur',
          paint: { 'fill-color': '#c23b3b', 'fill-opacity': 0.15 },
        });
        map.addLayer({
          id: 'blur-line',
          type: 'line',
          source: 'blur',
          paint: { 'line-color': '#2f3548', 'line-width': 2, 'line-dasharray': [2, 2] },
        });
      }
    };

    map.on('load', () => {
      drawCircle(origin.lat, origin.lng);
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = { lat: position.coords.latitude, lng: position.coords.longitude };
          setPoint(next);
          marker.setLngLat([next.lng, next.lat]);
          map.easeTo({ center: [next.lng, next.lat] });
          drawCircle(next.lat, next.lng);
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 8000 },
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource('blur') as GeoJSONSource | undefined;
    source?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [circleRing(point.lat, point.lng)] },
    });
  }, [point]);

  async function submit(event: FormEvent) {
    event.preventDefault();
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

  function back() {
    if (memo.trim() || stamp) setConfirmLeave(true);
    else onBack();
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="ここで刺された" onBack={back} />
      <div ref={holder} className="mx-3 h-56 overflow-hidden rounded-2xl" />
      <form className="flex flex-1 flex-col gap-3 px-4 py-3" onSubmit={submit}>
        <AppNotice>黒い円の中のどこかで公開されます。正確な位置は保存しません。メモも匿名です。</AppNotice>
        <StampPicker value={stamp} onChange={setStamp} />
        <MugMemo label="メモ（任意）" maxLength={100} value={memo} onChange={(event) => setMemo(event.target.value)} />
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        {confirmLeave ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold">投稿をやめますか？</p>
            <MugButton type="button" variant="outline" onClick={onBack}>
              やめる
            </MugButton>
            <MugButton type="button" variant="ghost" onClick={() => setConfirmLeave(false)}>
              続ける
            </MugButton>
          </div>
        ) : (
          <MugButton type="submit" disabled={busy}>
            {busy ? '投稿中' : '匿名で投稿する'}
          </MugButton>
        )}
      </form>
    </main>
  );
}
