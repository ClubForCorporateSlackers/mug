import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@/lib/map-worker';
import { AttributionControl, GeoJSONSource, Map, Marker } from 'maplibre-gl';
import { Info, LoaderCircle, MapPin, Navigation, UserRound } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { CenterPin } from '@/components/CenterPin';
import { DangerChip } from '@/components/DangerChip';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';
import { PillButton } from '@/components/PillButton';
import { RoundIconButton } from '@/components/RoundIconButton';
import { api } from '@/lib/api';
import { dangerAtCenter, groupPins, spotsData, type DangerLevel, type DangerSpot } from '@/lib/danger';
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
  posting: boolean;
  postError?: string;
  // 増えたらピンを読み直す（自分がピンを立てた直後など）
  pinsVersion: number;
  // この画面を開いているあいだに立てたピン（投稿の直後の読み直しに、まだ入っていないことがある）
  postedPins: Pin[];
  // 地図の真ん中（真ん中のピンの先）の場所でピンを立てる
  onPost: (point: { lat: number; lng: number }) => void;
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
  posting,
  postError,
  pinsVersion,
  postedPins,
  onPost,
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
  const reloadRef = useRef<(() => void) | null>(null);
  const startRef = useRef(position ?? TOKYO_STATION);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [pins, setPins] = useState<Pin[]>([]);
  const postedRef = useRef(postedPins);
  useEffect(() => {
    postedRef.current = postedPins;
  }, [postedPins]);
  const [danger, setDanger] = useState<DangerLevel | null>(null);

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
    let spots: DangerSpot[] = [];

    // 近いピンのかたまりを円で描き直す（縮尺が変わると画面の上の距離が変わるので、ズームのたびにも呼ぶ）
    const paintDanger = () => {
      spots = groupPins(map, [...latest.values()]);
      (map.getSource('danger') as GeoJSONSource | undefined)?.setData(spotsData(spots));
      setDanger(dangerAtCenter(map, spots));
    };

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
      paintDanger();
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
        // GET /api/pins は、書いた直後の内容をまだ返さないことがある（DynamoDB の結果整合性の読み込み）。
        // 立てたばかりのピンが返ってこなくても描けるように、自分が立てたピンのうち表示範囲にあるものを足す
        const ids = new Set(data.pins.map((pin) => pin.pinId));
        const posted = postedRef.current.filter(
          (pin) =>
            !ids.has(pin.pinId) &&
            pin.lat >= bounds.getSouth() &&
            pin.lat <= bounds.getNorth() &&
            pin.lng >= bounds.getWest() &&
            pin.lng <= bounds.getEast(),
        );
        show([...data.pins, ...posted]);
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
      map.addSource('danger', { type: 'geojson', data: spotsData([]) });
      map.addLayer({
        id: 'danger',
        type: 'circle',
        source: 'danger',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.55,
          'circle-blur': 0.15,
        },
      });
      ready = true;
      setLoaded(true);
      void draw();
    });
    map.on('move', () => setDanger(dangerAtCenter(map, spots)));
    map.on('zoomend', () => {
      if (ready) paintDanger();
    });
    map.on('moveend', () => {
      if (ready) schedule();
    });

    // ほかの人が立てたピンも出るように、見ている間は30秒ごとに読み直す
    const refresh = () => {
      if (ready && document.visibilityState === 'visible') void draw();
    };
    const poll = setInterval(refresh, 30000);
    reloadRef.current = () => {
      if (ready) void draw();
    };
    document.addEventListener('visibilitychange', refresh);

    return () => {
      reloadRef.current = null;
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

  useEffect(() => {
    if (pinsVersion > 0) reloadRef.current?.();
  }, [pinsVersion]);

  function postAtCenter() {
    const center = mapRef.current?.getCenter();
    if (center) onPost({ lat: center.lat, lng: center.lng });
  }

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
        {/* ピンの口の先（下の端）が地図の真ん中にくるように置く */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <CenterPin />
        </div>
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
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{place}</p>
                <p className="text-xs">この範囲に {pins.length}件の刺されピン</p>
              </div>
              {danger ? <DangerChip level={danger} /> : null}
            </div>
            <RoundIconButton icon={UserRound} label="マイページ" onClick={onMe} className="pointer-events-auto" />
          </div>
          {location === 'off' ? (
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold">
              <Info className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="flex-1">位置情報がオフのため、ピンを立てられません</span>
              <PillButton onClick={onAllowLocation}>許可する</PillButton>
            </div>
          ) : null}
          {location === 'off' && locationHint ? (
            <div className="pointer-events-auto">
              <AppNotice>{locationHint}</AppNotice>
            </div>
          ) : null}
          {postError ? (
            <div className="pointer-events-auto">
              <AppNotice tone="error">{postError}</AppNotice>
            </div>
          ) : null}
          {notice ? (
            <div className="pointer-events-auto">
              <AppNotice>{notice}</AppNotice>
            </div>
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-11 flex flex-col items-end gap-3">
          <RoundIconButton icon={Navigation} label="現在地へ" onClick={locate} className="pointer-events-auto" />
          <MugButton
            className="pointer-events-auto h-14 gap-3 text-lg"
            onClick={postAtCenter}
            disabled={!canPost || posting}
          >
            <MugMark className="size-9 rounded-full bg-secondary p-1" decorative />
            {posting
              ? 'ピンを立てています'
              : canPost
                ? 'ここで刺された！'
                : location === 'off'
                  ? '位置情報がオフです'
                  : '現在地を確認しています'}
          </MugButton>
        </div>
      </div>
      <BottomNav tab={tab} onChange={onTab} />
      {children}
    </main>
  );
}
