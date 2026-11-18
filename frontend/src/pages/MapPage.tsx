import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@/lib/map-worker';
import { AttributionControl, Map, Marker } from 'maplibre-gl';
import { Info, LoaderCircle, MapPin, Navigation, UserRound } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';
import { api } from '@/lib/api';
import { TOKYO_STATION } from '@/lib/geo';
import type { LatLng, LocationState } from '@/lib/location';
import { createHereMarker, createMugMarker } from '@/lib/marker';
import type { TabName } from '@/lib/route';
import type { Pin } from '@/lib/types';

type Props = {
  tab: TabName;
  position: LatLng | null;
  location: LocationState;
  locationHint?: string;
  onTab: (tab: TabName) => void;
  onCompose: () => void;
  onOpenPin: (pin: Pin) => void;
  onMe: () => void;
  onAllowLocation: () => void;
  children?: ReactNode;
};

type PinResponse = { pins: Pin[]; truncated: boolean };

// 表示中のピンでいちばん多い市町村名（「不明」は除く）
function topCity(pins: Pin[]): string | null {
  const counts = new globalThis.Map<string, number>();
  for (const pin of pins) {
    if (pin.city && pin.city !== '不明') counts.set(pin.city, (counts.get(pin.city) ?? 0) + 1);
  }
  let best: string | null = null;
  let most = 0;
  for (const [city, count] of counts) {
    if (count > most) {
      best = city;
      most = count;
    }
  }
  return best;
}

export function MapPage({
  tab,
  position,
  location,
  locationHint,
  onTab,
  onCompose,
  onOpenPin,
  onMe,
  onAllowLocation,
  children,
}: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markers = useRef(new globalThis.Map<string, Marker>());
  const hereRef = useRef<Marker | null>(null);
  const centeredRef = useRef(position !== null);
  const openRef = useRef(onOpenPin);
  const startRef = useRef(position ?? TOKYO_STATION);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [pins, setPins] = useState<Pin[]>([]);

  useEffect(() => {
    openRef.current = onOpenPin;
  }, [onOpenPin]);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const start = startRef.current;
    const map = new Map({
      container: element,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [start.lng, start.lat],
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    mapRef.current = map;

    const shown = markers.current;
    const latest = new globalThis.Map<string, Pin>();
    let request = 0;
    let ready = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // 表示中の範囲のピンに入れ替える。古い応答は捨て、同じピンは作り直さない。
    const show = (next: Pin[]) => {
      const keep = new Set(next.map((pin) => pin.pinId));
      for (const [id, marker] of shown) {
        if (!keep.has(id)) {
          marker.remove();
          shown.delete(id);
          latest.delete(id);
        }
      }
      for (const pin of next) {
        latest.set(pin.pinId, pin);
        if (shown.has(pin.pinId)) continue;
        const button = createMugMarker(`${pin.city || '場所不明'}のピン`);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          openRef.current(latest.get(pin.pinId) ?? pin);
        });
        shown.set(
          pin.pinId,
          new Marker({ element: button, anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]).addTo(map),
        );
      }
      setPins(next);
    };

    const draw = async () => {
      const id = ++request;
      const bounds = map.getBounds();
      const latSpan = bounds.getNorth() - bounds.getSouth();
      const lngSpan = bounds.getEast() - bounds.getWest();
      // GET /api/pins は縦横0.5度より広い範囲を受け付けない（docs/api-spec.md）
      if (latSpan > 0.5 || lngSpan > 0.5) {
        show([]);
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
        if (id !== request) return;
        show(data.pins);
        setNotice(data.truncated ? '表示しきれません。拡大してください' : '');
      } catch (err) {
        if (id !== request) return;
        setNotice(err instanceof Error ? err.message : 'ピンを読み込めませんでした');
      }
    };

    // 地図を動かしている間は読まず、止まってから1回だけ読む
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void draw(), 400);
    };

    // map.loaded() はタイルの読み込み中に false になるので、最初の load が済んだかを自分で持つ
    map.on('load', () => {
      ready = true;
      setLoaded(true);
      void draw();
    });
    map.on('moveend', () => {
      if (ready) schedule();
    });

    // ほかの人が立てたピンも出るように、見ている間は30秒ごとに読み直す
    const refresh = () => {
      if (ready && document.visibilityState === 'visible') void draw();
    };
    const poll = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', refresh);
      clearTimeout(timer);
      request += 1;
      shown.forEach((marker) => marker.remove());
      shown.clear();
      hereRef.current?.remove();
      hereRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!position) {
      hereRef.current?.remove();
      hereRef.current = null;
      return;
    }
    const lngLat: [number, number] = [position.lng, position.lat];
    if (hereRef.current) hereRef.current.setLngLat(lngLat);
    else hereRef.current = new Marker({ element: createHereMarker(), anchor: 'center' }).setLngLat(lngLat).addTo(map);
    if (!centeredRef.current) {
      centeredRef.current = true;
      map.jumpTo({ center: lngLat, zoom: 15 });
    }
  }, [position]);

  function locate() {
    if (position) mapRef.current?.flyTo({ center: [position.lng, position.lat], zoom: 15 });
    else onAllowLocation();
  }

  const place = topCity(pins) ?? (position ? '現在地の周辺' : '東京駅周辺');
  const canPost = location === 'on' && position !== null;

  return (
    <main className="flex h-svh flex-col">
      <div className="relative min-h-0 flex-1">
        <div ref={holder} className="h-full w-full" />
        {!loaded || location === 'pending' ? (
          <div className="absolute inset-0 grid place-items-center bg-background" role="status">
            <div className="flex flex-col items-center gap-2 text-sm font-bold">
              <LoaderCircle className="size-8 animate-spin" aria-hidden />
              {loaded ? '現在地を確認しています' : '地図を読み込んでいます'}
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="pointer-events-auto flex flex-1 items-center gap-2 rounded-full bg-card px-4 py-2">
              <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-bold">{place}</p>
                <p className="text-xs">この範囲に {pins.length}件の刺されピン</p>
              </div>
            </div>
            <button
              type="button"
              className="pointer-events-auto grid size-12 shrink-0 place-items-center rounded-full bg-card"
              aria-label="マイページ"
              onClick={onMe}
            >
              <UserRound className="size-5" aria-hidden />
            </button>
          </div>
          {location === 'off' ? (
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold">
              <Info className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="flex-1">位置情報がオフのため、ピンを立てられません</span>
              <button
                type="button"
                className="rounded-full bg-muted px-3 py-1.5 text-primary"
                onClick={onAllowLocation}
              >
                許可する
              </button>
            </div>
          ) : null}
          {location === 'off' && locationHint ? (
            <div className="pointer-events-auto">
              <AppNotice>{locationHint}</AppNotice>
            </div>
          ) : null}
          {notice ? (
            <div className="pointer-events-auto">
              <AppNotice>{notice}</AppNotice>
            </div>
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-11 flex flex-col items-end gap-3">
          <button
            type="button"
            className="pointer-events-auto grid size-12 place-items-center rounded-full bg-card"
            onClick={locate}
            aria-label="現在地へ"
          >
            <Navigation className="size-5" aria-hidden />
          </button>
          <MugButton className="pointer-events-auto h-14 gap-3 text-lg" onClick={onCompose} disabled={!canPost}>
            <MugMark className="size-9 rounded-full bg-secondary p-1" decorative />
            {canPost ? 'ここで刺された！' : location === 'off' ? '位置情報がオフです' : '現在地を確認しています'}
          </MugButton>
        </div>
      </div>
      <BottomNav tab={tab} onChange={onTab} />
      {children}
    </main>
  );
}
