import { useEffect, useRef, useState } from 'react';
import '@/lib/map-worker';
import { AttributionControl, Map, Marker } from 'maplibre-gl';
import { LocateFixed } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { MugButton } from '@/components/MugButton';
import { api } from '@/lib/api';
import { TOKYO_STATION } from '@/lib/geo';
import { createMugMarker } from '@/lib/marker';
import type { TabName } from '@/lib/route';
import type { Pin } from '@/lib/types';

type Props = {
  tab: TabName;
  onTab: (tab: TabName) => void;
  onCompose: () => void;
  onOpenPin: (pin: Pin) => void;
};

type PinResponse = { pins: Pin[]; truncated: boolean };

export function MapPage({ tab, onTab, onCompose, onOpenPin }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);
  const openRef = useRef(onOpenPin);
  useEffect(() => {
    openRef.current = onOpenPin;
  }, [onOpenPin]);
  const [notice, setNotice] = useState('ピンは半径100m以内でずらしてあります');
  const [place, setPlace] = useState('東京駅周辺');

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const map = new Map({
      container: element,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [TOKYO_STATION.lng, TOKYO_STATION.lat],
      zoom: 13,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    mapRef.current = map;

    const draw = async () => {
      if (!map.isStyleLoaded()) return;
      const bounds = map.getBounds();
      const latSpan = bounds.getNorth() - bounds.getSouth();
      const lngSpan = bounds.getEast() - bounds.getWest();
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      if (latSpan > 0.5 || lngSpan > 0.5) {
        setNotice('範囲が広すぎます。拡大してください');
        return;
      }
      const query = new URLSearchParams({
        minLat: String(bounds.getSouth()),
        maxLat: String(bounds.getNorth()),
        minLng: String(bounds.getWest()),
        maxLng: String(bounds.getEast()),
      });
      try {
        const data = await api<PinResponse>('GET', `/api/pins?${query}`);
        if (data.truncated) setNotice('表示しきれません。拡大してください');
        else setNotice('ピンは半径100m以内でずらしてあります');
        for (const pin of data.pins) {
          const button = createMugMarker(pin.city || 'ピン');
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            openRef.current(pin);
          });
          const marker = new Marker({ element: button, anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]).addTo(map);
          markers.current.push(marker);
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'ピンを読み込めませんでした');
      }
    };

    map.on('load', () => void draw());
    map.on('moveend', () => void draw());
    return () => {
      markers.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function locate() {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPlace('現在地の周辺');
        map.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 15 });
      },
      () => setPlace('東京駅周辺'),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <main className="flex h-svh flex-col">
      <div className="relative min-h-0 flex-1">
        <div ref={holder} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <p className="pointer-events-auto rounded-full bg-card px-3 py-2 text-sm font-bold">{place}</p>
          <button
            type="button"
            className="pointer-events-auto grid size-10 place-items-center rounded-full bg-card"
            onClick={locate}
            aria-label="現在地へ"
          >
            <LocateFixed className="size-5" aria-hidden />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-3">
          <div className="pointer-events-auto mb-2">
            <AppNotice>{notice}</AppNotice>
          </div>
          <MugButton className="pointer-events-auto" onClick={onCompose}>
            ここで刺された！
          </MugButton>
        </div>
      </div>
      <BottomNav tab={tab} onChange={onTab} />
    </main>
  );
}
