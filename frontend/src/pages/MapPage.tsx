import { useCallback, useEffect, useRef, useState } from 'react';
import { MapStatusBanner } from '@/components/MapStatusBanner';
import { PinDetailCard } from '@/components/PinDetailCard';
import { LocateButton } from '@/components/LocateButton';
import { PinMap, type MapFocus } from '@/components/PinMap';
import { api } from '@/lib/api';
import type { Bounds, Pin, PinsResponse } from '@/lib/api-types';

// docs/api-spec.md「4. GET /api/pins」：縦横どちらかが0.5度より大きいと 400
const MAX_SPAN = 0.5;
// 地図を動かしている最中に何度も呼ばないよう、止まってから少し待って呼ぶ
const DEBOUNCE_MS = 300;
// 現在地の取得。速さを優先し、1分以内に取った位置なら使い回す。10秒で諦める
const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 };
// 「現在地を取得できませんでした」などを出しておく時間
const NOTICE_MS = 4000;

type Status =
  { kind: 'too-wide' } | { kind: 'loading' } | { kind: 'ok'; truncated: boolean } | { kind: 'error'; message: string };

function statusMessage(status: Status): { message: string | null; tone: 'info' | 'error' } {
  switch (status.kind) {
    case 'too-wide':
      return { message: 'ピンを見るには、地図を拡大してください', tone: 'info' };
    case 'loading':
      return { message: '読み込み中…', tone: 'info' };
    case 'ok':
      return { message: status.truncated ? 'ピンが多いので、拡大してください' : null, tone: 'info' };
    case 'error':
      return { message: `ピンを読み込めませんでした：${status.message}`, tone: 'error' };
  }
}

// 地図の画面（ログイン不要）。表示範囲のピンを GET /api/pins で取って出す
export function MapPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 古い呼び出しの結果で上書きしないように、呼んだ順に番号を振る
  const requestIdRef = useRef(0);

  const loadPins = useCallback(async (bounds: Bounds) => {
    // 「35.68」のような小数の形で送る（指数表記にならないよう toFixed）
    const minLat = Math.max(bounds.minLat, -90).toFixed(5);
    const maxLat = Math.min(bounds.maxLat, 90).toFixed(5);
    const minLng = bounds.minLng.toFixed(5);
    const maxLng = bounds.maxLng.toFixed(5);

    const requestId = ++requestIdRef.current;
    if (Number(maxLat) - Number(minLat) > MAX_SPAN || Number(maxLng) - Number(minLng) > MAX_SPAN) {
      setPins([]);
      setStatus({ kind: 'too-wide' });
      return;
    }

    setStatus({ kind: 'loading' });
    try {
      const query = new URLSearchParams({ minLat, maxLat, minLng, maxLng });
      const data = await api<PinsResponse>('GET', `/api/pins?${query}`);
      if (requestId !== requestIdRef.current) return;
      setPins(data.pins);
      setStatus({ kind: 'ok', truncated: data.truncated });
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : '不明なエラー' });
    }
  }, []);

  const handleBoundsChange = useCallback(
    (bounds: Bounds) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void loadPins(bounds), DEBOUNCE_MS);
    },
    [loadPins],
  );

  const showNotice = useCallback((message: string) => {
    clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  // 取れた現在地へ地図を動かす。座標は地図を動かすのに使うだけで、送ったり保存したりしない
  const moveToPosition = useCallback((pos: GeolocationPosition) => {
    setFocus((f) => ({ lat: pos.coords.latitude, lng: pos.coords.longitude, seq: (f?.seq ?? 0) + 1 }));
  }, []);

  // 開いたら現在地を求める。地図は先に代々木公園あたりを出しておき、取れたら移動する。
  // 許可されない・取れないときは、何も出さずに代々木公園あたりのまま
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(moveToPosition, () => {}, GEO_OPTIONS);
  }, [moveToPosition]);

  // 「現在地」ボタン。失敗したらお知らせを出す
  function locate() {
    if (!('geolocation' in navigator)) {
      showNotice('この端末では現在地を使えません');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        moveToPosition(pos);
      },
      (err) => {
        setLocating(false);
        showNotice(
          err.code === err.PERMISSION_DENIED ? '位置情報の利用が許可されていません' : '現在地を取得できませんでした',
        );
      },
      GEO_OPTIONS,
    );
  }

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  const banner = notice ? { message: notice, tone: 'error' as const } : statusMessage(status);

  return (
    <main className="relative min-h-0 flex-1">
      <PinMap
        pins={pins}
        selectedPinId={selectedPin?.pinId ?? null}
        focus={focus}
        onBoundsChange={handleBoundsChange}
        onSelectPin={setSelectedPin}
      />
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
        <MapStatusBanner message={banner.message} tone={banner.tone} />
      </div>
      {/* 右上の拡大・縮小ボタンの下に置く */}
      <div className="absolute top-20 right-2.5">
        <LocateButton loading={locating} onClick={locate} />
      </div>
      {selectedPin && (
        <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
          <PinDetailCard pin={selectedPin} onClose={() => setSelectedPin(null)} />
        </div>
      )}
    </main>
  );
}
