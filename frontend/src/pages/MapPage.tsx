import { useCallback, useEffect, useRef, useState } from 'react';
import '@/lib/map-worker';
import { AttributionControl, GeoJSONSource, Map as MapView, Marker } from 'maplibre-gl';
import { CircleAlert, EyeOff, Flag, Move, Navigation, Pencil, Trash2, User } from 'lucide-react';
import { ActionMenu, type MenuAction } from '@/components/ActionMenu';
import { AdjustPanel } from '@/components/AdjustPanel';
import { AppNotice } from '@/components/AppNotice';
import { AreaCard } from '@/components/AreaCard';
import { BottomSheet } from '@/components/BottomSheet';
import { CommentInput } from '@/components/CommentInput';
import { CommentList } from '@/components/CommentList';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MapBanner } from '@/components/MapBanner';
import { MapSurface } from '@/components/MapSurface';
import { MugMark } from '@/components/MugMark';
import { PinHeader } from '@/components/PinHeader';
import { PostPanel } from '@/components/PostPanel';
import { ReactionBar } from '@/components/ReactionBar';
import { ReactionPicker } from '@/components/ReactionPicker';
import { RoundButton } from '@/components/RoundButton';
import { SasaretaButton } from '@/components/SasaretaButton';
import { StampChip } from '@/components/StampChip';
import { TabBar } from '@/components/TabBar';
import { api } from '@/lib/api';
import { idToken } from '@/lib/auth';
import { TOKYO_STATION, circleRing, inJapan } from '@/lib/geo';
import { currentMonth, timeAgo } from '@/lib/labels';
import { currentPosition, locationState } from '@/lib/location';
import { createMugMarker, createUserDot, themeColor } from '@/lib/marker';
import type { TabName } from '@/lib/route';
import type { Area, Comment, Pin, PinStamp, Profile, ReactionType, RiskArea } from '@/lib/types';

type Props = {
  onTab: (tab: TabName) => void;
  onProfile: () => void;
  // マイページの「自分のピン」から来たとき、そのピンを開く
  focusPin?: Pin;
};

type Point = { lat: number; lng: number };
type PinResponse = { pins: Pin[]; truncated: boolean };
type ReactionResponse = { reactions: Pin['reactions']; myReactions: ReactionType[] };
// browse：見る／compose：立てた直後（B4）／edit：自分のピンのスタンプ・ひとことを直す／move：自分のピンを動かす
type Mode = 'browse' | 'compose' | 'edit' | 'move';

const OTHER_ACTIONS: MenuAction[] = [
  { id: 'report', label: 'このピンを通報する', icon: Flag, danger: true },
  { id: 'hide', label: 'このピンを非表示にする', icon: EyeOff },
];
const MY_ACTIONS: MenuAction[] = [
  { id: 'move', label: 'ピンの位置を調整する', icon: Move },
  { id: 'edit', label: 'コメントを編集する', icon: Pencil },
  { id: 'delete', label: 'このピンを削除する', icon: Trash2, danger: true },
];

// 「非表示にする」はこの端末だけ（API は使わない。docs/api-spec.md の #16）
const HIDDEN_KEY = 'mug-hidden-pins';
function loadHidden(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function saveHidden(ids: string[]): void {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
  } catch {
    // 保存できなくても、この画面を開いている間は隠れたまま
  }
}

function pinPath(pinId: string): `/api/${string}` {
  return `/api/pins/${encodeURIComponent(pinId)}`;
}

function boundsQuery(map: MapView): URLSearchParams | null {
  const bounds = map.getBounds();
  if (bounds.getNorth() - bounds.getSouth() > 0.5 || bounds.getEast() - bounds.getWest() > 0.5) return null;
  return new URLSearchParams({
    minLat: String(bounds.getSouth()),
    maxLat: String(bounds.getNorth()),
    minLng: String(bounds.getWest()),
    maxLng: String(bounds.getEast()),
  });
}

// B1〜B10 マップ（ピンを見る・立てる・詳細）
export function MapPage({ onTab, onProfile, focusPin }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapView | null>(null);
  const markers = useRef<Marker[]>([]);
  const draftMarker = useRef<Marker | null>(null);
  const userMarker = useRef<Marker | null>(null);
  const loadPinsRef = useRef<() => void>(() => undefined);
  const focusRef = useRef(focusPin);

  const [location, setLocation] = useState<'loading' | 'on' | 'off'>('loading');
  const [pins, setPins] = useState<Pin[]>([]);
  const [riskAreas, setRiskAreas] = useState<RiskArea[]>([]);
  const [area, setArea] = useState<Area | null>(null);
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const [nickname, setNickname] = useState('');
  const [myPinIds, setMyPinIds] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>(loadHidden);

  // 投稿と自分のピンの編集（B4・B6・B10）
  const [mode, setMode] = useState<Mode>('browse');
  // 合わせた場所（点線の円の中心）と、対象のピン（サーバーが100mずらした位置）
  const [draft, setDraft] = useState<Point | null>(null);
  const [target, setTarget] = useState<Pin | null>(null);
  const [stamp, setStamp] = useState<PinStamp | null>(null);
  const [memo, setMemo] = useState('');
  const [postError, setPostError] = useState('');
  const [posting, setPosting] = useState(false);
  const [toDelete, setToDelete] = useState<Pin | null>(null);

  // ピンの詳細（B7〜B9）
  const [selected, setSelected] = useState<Pin | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<ReactionType, number>>>({});
  const [mine, setMine] = useState<ReactionType[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);

  const flash = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  // ピンの詳細（B7）を開く。コメントと、リアクションの数・自分が押したもの（#13）を読む
  const openPin = useCallback(
    (pin: Pin) => {
      setSelected(pin);
      setCounts(pin.reactions ?? {});
      setMine([]);
      setComments([]);
      setText('');
      setCommentsLoading(true);
      api<{ comments: Comment[] }>('GET', `${pinPath(pin.pinId)}/comments`)
        .then((data) => setComments(data.comments))
        .catch((err: unknown) => flash(err instanceof Error ? err.message : 'コメントを読み込めませんでした'))
        .finally(() => setCommentsLoading(false));
      void (async () => {
        try {
          const data = await api<ReactionResponse>('GET', `${pinPath(pin.pinId)}/reactions`, {
            idToken: await idToken(),
          });
          setCounts(data.reactions ?? {});
          setMine(data.myReactions);
        } catch {
          // 読めなくても、ピンの一覧にあった数を出しておく
        }
      })();
    },
    [flash],
  );
  const openPinRef = useRef(openPin);
  useEffect(() => {
    openPinRef.current = openPin;
  }, [openPin]);

  // 地図を作る
  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const map = new MapView({
      container: element,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [TOKYO_STATION.lng, TOKYO_STATION.lat],
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    mapRef.current = map;

    // 表示範囲のピンと危険エリア（#15）、地図の中央の地点の情報（#14）
    const load = async () => {
      const center = map.getCenter();
      void api<Area>('GET', `/api/area?${new URLSearchParams({ lat: String(center.lat), lng: String(center.lng) })}`)
        .then(setArea)
        .catch(() => setArea(null));
      const query = boundsQuery(map);
      if (!query) {
        setPins([]);
        setRiskAreas([]);
        setNotice('範囲が広すぎます。拡大してください');
        return;
      }
      void api<{ areas: RiskArea[] }>('GET', `/api/risk-areas?${query}`)
        .then((data) => setRiskAreas(data.areas))
        .catch(() => setRiskAreas([]));
      try {
        const data = await api<PinResponse>('GET', `/api/pins?${query}`);
        setPins(data.pins);
        setNotice(data.truncated ? '表示しきれません。拡大してください' : '');
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'ピンを読み込めませんでした');
      }
    };
    loadPinsRef.current = () => void load();
    map.on('load', () => {
      const focus = focusRef.current;
      if (focus) {
        map.jumpTo({ center: [focus.lng, focus.lat], zoom: 16 });
        openPinRef.current(focus);
      }
      void load();
    });
    map.on('moveend', () => void load());
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 地図のピンを描き直す（非表示にしたピンと、シートで大きく出しているピンは除く）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((marker) => marker.remove());
    const big = mode === 'compose' || mode === 'move' ? target?.pinId : undefined;
    markers.current = pins
      .filter((pin) => pin.pinId !== big && !hidden.includes(pin.pinId))
      .map((pin) => {
        const button = createMugMarker(`${pin.city || '場所不明'}のピン`);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          openPinRef.current(pin);
        });
        return new Marker({ element: button, anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]).addTo(map);
      });
  }, [pins, mode, target, hidden]);

  // 危険エリアの円（Figma の Risk area。色は index.css の risk-high・mid・low）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const data = {
      type: 'FeatureCollection' as const,
      features: riskAreas.map((item) => ({
        type: 'Feature' as const,
        properties: { risk: item.risk },
        geometry: { type: 'Polygon' as const, coordinates: [circleRing(item.lat, item.lng, item.radiusM)] },
      })),
    };
    const source = map.getSource('risk') as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else if (map.isStyleLoaded()) {
      map.addSource('risk', { type: 'geojson', data });
      map.addLayer({
        id: 'risk-fill',
        type: 'fill',
        source: 'risk',
        paint: {
          'fill-color': [
            'match',
            ['get', 'risk'],
            'high',
            themeColor('risk-high'),
            'mid',
            themeColor('risk-mid'),
            themeColor('risk-low'),
          ],
          'fill-opacity': 0.3,
        },
      });
    }
  }, [riskAreas]);

  // 現在地を取る（B1 読み込み中 → B2、取れなければ B3）
  const locate = useCallback(async (fly: boolean) => {
    try {
      const point = await currentPosition();
      setLocation('on');
      const map = mapRef.current;
      if (map) {
        userMarker.current?.remove();
        userMarker.current = new Marker({ element: createUserDot() }).setLngLat([point.lng, point.lat]).addTo(map);
        if (fly) map.flyTo({ center: [point.lng, point.lat], zoom: 16 });
      }
      return point;
    } catch {
      setLocation('off');
      return null;
    }
  }, []);

  useEffect(() => {
    void locationState().then((state) => {
      if (state === 'denied') setLocation('off');
      // マイページから特定のピンを開いたときは、そのピンの場所のまま
      else void locate(!focusRef.current);
    });
  }, [locate]);

  // ニックネーム（コメント欄の「○○ としてコメント…」）と、自分のピン（#12。メニューを B10 にする）
  useEffect(() => {
    void (async () => {
      const token = await idToken();
      try {
        setNickname((await api<Profile>('GET', '/api/me', { idToken: token })).nickname);
      } catch {
        setNickname('');
      }
      try {
        const data = await api<{ pins: Pin[] }>('GET', '/api/me/pins', { idToken: token });
        setMyPinIds(data.pins.map((pin) => pin.pinId));
      } catch {
        // 分からないときは、この画面で立てたピンだけを自分のピンとして扱う
      }
    })();
  }, []);

  // 大きく出すピンと、合わせた場所の半径100mの円（B4 の立てた直後、B10 の位置の調整）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    draftMarker.current?.remove();
    draftMarker.current = null;
    const source = map.getSource('draft') as GeoJSONSource | undefined;
    if (mode !== 'compose' || !draft || !target) {
      source?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    const data = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Polygon' as const, coordinates: [circleRing(draft.lat, draft.lng)] },
    };
    if (source) source.setData(data);
    else if (map.isStyleLoaded()) {
      map.addSource('draft', { type: 'geojson', data });
      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft',
        paint: { 'line-color': themeColor('primary'), 'line-width': 2, 'line-dasharray': [2, 2] },
      });
    }
    draftMarker.current = new Marker({ element: createMugMarker('あなたが立てたピン', true), anchor: 'bottom' })
      .setLngLat([target.lng, target.lat])
      .addTo(map);
  }, [draft, target, mode]);

  function centerInJapan(): Point | null {
    const center = mapRef.current?.getCenter();
    if (!center) return null;
    if (!inJapan(center.lat, center.lng)) {
      flash('日本の範囲の中で場所を選んでください');
      return null;
    }
    return { lat: center.lat, lng: center.lng };
  }

  function closePanel() {
    setMode('browse');
    setDraft(null);
    setTarget(null);
    setPostError('');
  }

  // 「ここで刺された！」。画面の中央のピンの位置に、その場ですぐ立てる。
  // 地図は最初は現在地が中央なので、動かさなければ現在地になる
  async function startPost() {
    const point = centerInJapan();
    if (!point) return;
    setSelected(null);
    setPosting(true);
    try {
      const pin = await api<Pin>('POST', '/api/pins', {
        idToken: await idToken(),
        body: { lat: point.lat, lng: point.lng, stamp: null, memo: '' },
      });
      setMyPinIds((ids) => [...ids, pin.pinId]);
      setDraft(point);
      setTarget(pin);
      setStamp(null);
      setMemo('');
      setPostError('');
      setMode('compose');
      loadPinsRef.current();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'ピンを立てられませんでした');
    } finally {
      setPosting(false);
    }
  }

  // B4 の「完了」（立てた直後）と、B10「コメントを編集する」の「完了」。PATCH /api/pins/{pinId}（#10）
  async function saveExtras() {
    if (!target) return;
    // 立てた直後で何も付けなければ、閉じるだけ
    if (mode === 'compose' && !stamp && !memo.trim()) {
      closePanel();
      return;
    }
    setPosting(true);
    setPostError('');
    try {
      await api<Pin>('PATCH', pinPath(target.pinId), {
        idToken: await idToken(),
        body: { stamp, memo: memo.trim() },
      });
      flash(mode === 'compose' ? 'スタンプとひとことを付けました' : 'ピンを直しました');
      closePanel();
      loadPinsRef.current();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : '保存できませんでした');
    } finally {
      setPosting(false);
    }
  }

  // B10「ピンの位置を調整する」の「この位置にする」。地図の中央へ動かす（サーバーがもう一度100mずらす）
  async function saveMove() {
    if (!target) return;
    const point = centerInJapan();
    if (!point) return;
    try {
      await api<Pin>('PATCH', pinPath(target.pinId), { idToken: await idToken(), body: point });
      flash('ピンの位置を変えました');
      closePanel();
      loadPinsRef.current();
    } catch (err) {
      flash(err instanceof Error ? err.message : '位置を変えられませんでした');
    }
  }

  // B6「取り消す」と B10「このピンを削除する」。DELETE /api/pins/{pinId}（#11）
  async function deletePin() {
    const pin = toDelete;
    setToDelete(null);
    if (!pin) return;
    try {
      await api<{ pinId: string }>('DELETE', pinPath(pin.pinId), { idToken: await idToken() });
      setMyPinIds((ids) => ids.filter((id) => id !== pin.pinId));
      setSelected(null);
      closePanel();
      flash('ピンを消しました');
      loadPinsRef.current();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'ピンを消せませんでした');
    }
  }

  async function toggleReaction(type: ReactionType) {
    if (!selected) return;
    try {
      const data = await api<ReactionResponse>(
        mine.includes(type) ? 'DELETE' : 'PUT',
        `${pinPath(selected.pinId)}/reactions/${type}`,
        { idToken: await idToken() },
      );
      setCounts(data.reactions ?? {});
      setMine(data.myReactions);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'リアクションを送れませんでした');
    }
  }

  async function sendComment() {
    if (!selected || !text.trim()) return;
    setSending(true);
    try {
      const comment = await api<Comment>('POST', `${pinPath(selected.pinId)}/comments`, {
        idToken: await idToken(),
        body: { text: text.trim() },
      });
      setComments((prev) => [...prev, comment]);
      setText('');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'コメントを送れませんでした');
    } finally {
      setSending(false);
    }
  }

  // B9（ほかの人のピン）と B10（自分のピン）のメニュー
  async function selectMenu(id: string) {
    setMenu(false);
    const pin = selected;
    if (!pin) return;
    if (id === 'report') {
      try {
        await api<{ ok: boolean }>('POST', `${pinPath(pin.pinId)}/report`, {
          idToken: await idToken(),
          body: { reason: '' },
        });
        flash('通報しました。ご協力ありがとうございます');
      } catch (err) {
        flash(err instanceof Error ? err.message : '通報できませんでした');
      }
    } else if (id === 'hide') {
      const next = [...hidden, pin.pinId];
      setHidden(next);
      saveHidden(next);
      setSelected(null);
      flash('このピンを非表示にしました（この端末だけ）');
    } else if (id === 'move') {
      setSelected(null);
      setTarget(pin);
      setMode('move');
      mapRef.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 17 });
    } else if (id === 'edit') {
      setSelected(null);
      setTarget(pin);
      setStamp(pin.stamp);
      setMemo(pin.memo);
      setPostError('');
      setMode('edit');
    } else if (id === 'delete') {
      setToDelete(pin);
    }
  }

  const month = currentMonth();
  const thisMonth = pins.filter((pin) => pin.createdAt.startsWith(month)).length;
  const isMine = selected ? myPinIds.includes(selected.pinId) : false;

  return (
    <main className="relative h-svh overflow-hidden">
      <MapSurface ref={holder} label="地図" />

      {/* 画面の中央に固定したピン。地図を動かして刺された場所に合わせ、「ここで刺された！」で立てる */}
      {(mode === 'browse' && location === 'on') || mode === 'move' ? (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <MugMark label="ピンを立てる位置（地図の中央）" className="h-[78px] w-14" />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] flex flex-col gap-2">
        {mode === 'browse' ? (
          <div className="pointer-events-auto flex gap-2">
            {location === 'loading' ? (
              <AreaCard title="現在地を取得中…" subtitle="しばらくお待ちください" />
            ) : (
              <AreaCard
                title={area?.city ?? '表示中のエリア'}
                subtitle={`今月 ${area?.monthCount ?? thisMonth}件の刺されピン`}
                risk={area?.risk ?? null}
              />
            )}
            <RoundButton icon={User} label="マイページ" size="lg" onClick={onProfile} />
          </div>
        ) : null}
        {mode === 'move' ? (
          <div className="pointer-events-auto">
            <MapBanner icon={Move}>地図を動かして、刺された場所にピンを合わせてください</MapBanner>
          </div>
        ) : null}
        {location === 'off' && mode === 'browse' ? (
          <div className="pointer-events-auto">
            <MapBanner
              icon={CircleAlert}
              tone="warning"
              actionLabel="許可する"
              onAction={() =>
                void locate(true).then((point) => {
                  if (!point) flash('ブラウザの設定で、このサイトの位置情報を許可してください');
                })
              }
            >
              位置情報がオフのため、ピンを立てられません
            </MapBanner>
          </div>
        ) : null}
        {notice && mode === 'browse' ? <AppNotice floating>{notice}</AppNotice> : null}
        {toast ? <AppNotice floating>{toast}</AppNotice> : null}
      </div>

      {mode === 'browse' ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(49px+env(safe-area-inset-bottom)+48px)] flex flex-col items-end gap-4">
          <RoundButton
            icon={Navigation}
            label="現在地へ"
            className="pointer-events-auto"
            disabled={location !== 'on'}
            onClick={() => void locate(true)}
          />
          <div className="pointer-events-auto w-full">
            <SasaretaButton
              disabled={location !== 'on' || posting}
              label={location === 'off' ? '位置情報がオフです' : posting ? 'ピンを立てています…' : 'ここで刺された！'}
              onClick={() => void startPost()}
            />
          </div>
        </div>
      ) : null}

      {mode === 'browse' ? <TabBar tab="map" onChange={onTab} /> : null}

      {mode === 'compose' || mode === 'edit' ? (
        <PostPanel
          title={mode === 'compose' ? 'ピンを立てました！' : 'ピンを編集'}
          cancelLabel={mode === 'compose' ? '取り消す' : 'やめる'}
          stamp={stamp}
          memo={memo}
          busy={posting}
          error={postError}
          onStamp={setStamp}
          onMemo={setMemo}
          onCancel={() => (mode === 'compose' && target ? setToDelete(target) : closePanel())}
          onClose={closePanel}
          onDone={() => void saveExtras()}
        />
      ) : null}
      {mode === 'move' ? <AdjustPanel onCancel={closePanel} onConfirm={() => void saveMove()} /> : null}
      <ConfirmDialog
        open={toDelete !== null}
        title={mode === 'compose' ? 'このピンを取り消しますか？' : 'このピンを削除しますか？'}
        description="消したピンは元に戻せません。コメントとリアクションも消えます。"
        confirmLabel={mode === 'compose' ? '取り消す' : '削除する'}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void deletePin()}
      />

      <BottomSheet open={selected !== null} onClose={() => setSelected(null)} title="ピンの詳細">
        {selected ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-4">
              <PinHeader
                title={isMine ? 'あなたのピン（匿名で公開中）' : '匿名さんのピン'}
                subtitle={`${selected.city || '場所不明'}・${timeAgo(selected.createdAt)}`}
                onMenu={() => setMenu(true)}
              />
              {selected.stamp ? <StampChip stamp={selected.stamp} /> : null}
              {selected.memo ? (
                <p className="text-[17px] leading-[26px] font-medium whitespace-pre-wrap">{selected.memo}</p>
              ) : null}
              <ReactionBar
                counts={counts}
                mine={mine}
                onToggle={(type) => void toggleReaction(type)}
                onMore={() => setPicker(true)}
              />
              <CommentList
                loading={commentsLoading}
                comments={comments.map((comment) => ({ ...comment, when: timeAgo(comment.createdAt) }))}
              />
            </div>
            <CommentInput
              value={text}
              busy={sending}
              placeholder={nickname ? `${nickname} としてコメント…` : 'コメント…'}
              onChange={setText}
              onSubmit={() => void sendComment()}
            />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet open={picker} onClose={() => setPicker(false)} title="リアクションを送る" showTitle>
        <ReactionPicker
          mine={mine}
          note="押した人の名前は表示されません。"
          onToggle={(type) => void toggleReaction(type)}
        />
      </BottomSheet>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title="ピンのメニュー" tone="plain">
        <ActionMenu
          actions={isMine ? MY_ACTIONS : OTHER_ACTIONS}
          onSelect={(id) => void selectMenu(id)}
          onCancel={() => setMenu(false)}
        />
      </BottomSheet>
    </main>
  );
}
