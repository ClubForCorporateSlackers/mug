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
import { ApiError, api } from '@/lib/api';
import { idToken } from '@/lib/auth';
import { TOKYO_STATION, circleRing, inJapan } from '@/lib/geo';
import { currentMonth, timeAgo } from '@/lib/labels';
import { currentPosition, locationState } from '@/lib/location';
import { createMugMarker, createUserDot, themeColor } from '@/lib/marker';
import type { TabName } from '@/lib/route';
import type { Comment, Pin, PinStamp, Profile, ReactionType } from '@/lib/types';

type Props = {
  // ゲスト（ログインなしで見ている人）。投稿・コメント・リアクションはログインへ案内する
  guest: boolean;
  onTab: (tab: TabName) => void;
  onProfile: () => void;
  onNeedLogin: () => void;
};

type Point = { lat: number; lng: number };
type PinResponse = { pins: Pin[]; truncated: boolean };
type ReactionResponse = { reactions: Pin['reactions']; myReactions: ReactionType[] };

// API がまだない操作を押したときの表示（PR で API の追加をお願いしている）
const WAITING = '準備中です（APIの追加待ち）';

const OTHER_ACTIONS: MenuAction[] = [
  { id: 'report', label: 'このピンを通報する', icon: Flag, danger: true },
  { id: 'hide', label: 'このピンを非表示にする', icon: EyeOff },
];
const MY_ACTIONS: MenuAction[] = [
  { id: 'move', label: 'ピンの位置を調整する', icon: Move },
  { id: 'edit', label: 'コメントを編集する', icon: Pencil },
  { id: 'delete', label: 'このピンを削除する', icon: Trash2, danger: true },
];

// B1〜B10 マップ（ピンを見る・立てる・詳細）
export function MapPage({ guest, onTab, onProfile, onNeedLogin }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapView | null>(null);
  const markers = useRef<Marker[]>([]);
  const draftMarker = useRef<Marker | null>(null);
  const userMarker = useRef<Marker | null>(null);
  const loadPinsRef = useRef<() => void>(() => undefined);

  const [location, setLocation] = useState<'loading' | 'on' | 'off'>('loading');
  const [here, setHere] = useState<Point | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const [nickname, setNickname] = useState('');
  const [myPinIds, setMyPinIds] = useState<string[]>([]);

  // 投稿（B4〜B6）
  const [mode, setMode] = useState<'browse' | 'compose' | 'adjust'>('browse');
  const [draft, setDraft] = useState<Point | null>(null);
  const [stamp, setStamp] = useState<PinStamp | null>(null);
  const [memo, setMemo] = useState('');
  const [postError, setPostError] = useState('');
  const [posting, setPosting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ピンの詳細（B7〜B10）
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

  // ピンの詳細（B7）を開く。コメントとリアクションの数を用意する
  const openPin = useCallback(
    (pin: Pin) => {
      setSelected(pin);
      setCounts(pin.reactions ?? {});
      // TODO(API): 自分が押したリアクションは GET では分からない（押した後の返事でだけ分かる）
      setMine([]);
      setComments([]);
      setText('');
      setCommentsLoading(true);
      api<{ comments: Comment[] }>('GET', `/api/pins/${encodeURIComponent(pin.pinId)}/comments`)
        .then((data) => setComments(data.comments))
        .catch((err: unknown) => flash(err instanceof Error ? err.message : 'コメントを読み込めませんでした'))
        .finally(() => setCommentsLoading(false));
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

    const load = async () => {
      const bounds = map.getBounds();
      if (bounds.getNorth() - bounds.getSouth() > 0.5 || bounds.getEast() - bounds.getWest() > 0.5) {
        setPins([]);
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
        setPins(data.pins);
        setNotice(data.truncated ? '表示しきれません。拡大してください' : '');
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'ピンを読み込めませんでした');
      }
    };
    loadPinsRef.current = () => void load();
    map.on('load', () => void load());
    map.on('moveend', () => void load());
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 地図のピンを描き直す
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = pins.map((pin) => {
      const button = createMugMarker(`${pin.city || '場所不明'}のピン`);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openPinRef.current(pin);
      });
      return new Marker({ element: button, anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]).addTo(map);
    });
  }, [pins]);

  // 現在地を取る（B1 読み込み中 → B2、取れなければ B3）
  const locate = useCallback(async (fly: boolean) => {
    try {
      const point = await currentPosition();
      setHere(point);
      setLocation('on');
      const map = mapRef.current;
      if (map) {
        userMarker.current?.remove();
        userMarker.current = new Marker({ element: createUserDot() }).setLngLat([point.lng, point.lat]).addTo(map);
        if (fly) map.flyTo({ center: [point.lng, point.lat], zoom: 15 });
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
      else void locate(true);
    });
  }, [locate]);

  // コメント欄の「○○ としてコメント…」に使う
  useEffect(() => {
    if (guest) return;
    void (async () => {
      try {
        const profile = await api<Profile>('GET', '/api/me', { idToken: await idToken() });
        setNickname(profile.nickname);
      } catch {
        setNickname('');
      }
    })();
  }, [guest]);

  // 投稿中のピンと半径100mの円（B4）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    draftMarker.current?.remove();
    draftMarker.current = null;
    const source = map.getSource('draft') as GeoJSONSource | undefined;
    // 点線の円は B4 だけ（B5 の位置の調整中は出さない）
    if (!draft || mode !== 'compose') {
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
    draftMarker.current = new Marker({ element: createMugMarker('立てるピン', true), anchor: 'bottom' })
      .setLngLat([draft.lng, draft.lat])
      .addTo(map);
  }, [draft, mode]);

  async function startPost() {
    if (guest) {
      onNeedLogin();
      return;
    }
    const point = (await locate(false)) ?? here;
    if (!point) return;
    setSelected(null);
    setDraft(point);
    setStamp(null);
    setMemo('');
    setPostError('');
    setMode('compose');
    mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom: 16 });
  }

  function confirmAdjust() {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    if (!inJapan(center.lat, center.lng)) {
      flash('日本の範囲の中で場所を選んでください');
      return;
    }
    setDraft({ lat: center.lat, lng: center.lng });
    setMode('compose');
  }

  async function submitPost() {
    if (!draft) return;
    setPosting(true);
    setPostError('');
    try {
      const pin = await api<Pin>('POST', '/api/pins', {
        idToken: await idToken(),
        body: { lat: draft.lat, lng: draft.lng, stamp, memo: memo.trim() },
      });
      setMyPinIds((ids) => [...ids, pin.pinId]);
      setMode('browse');
      setDraft(null);
      flash('ピンを立てました！');
      loadPinsRef.current();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : '投稿できませんでした');
    } finally {
      setPosting(false);
    }
  }

  function cancelPost() {
    setConfirmCancel(false);
    setMode('browse');
    setDraft(null);
  }

  async function toggleReaction(type: ReactionType) {
    if (!selected) return;
    if (guest) {
      onNeedLogin();
      return;
    }
    try {
      const data = await api<ReactionResponse>(
        mine.includes(type) ? 'DELETE' : 'PUT',
        `/api/pins/${encodeURIComponent(selected.pinId)}/reactions/${type}`,
        { idToken: await idToken() },
      );
      setCounts(data.reactions ?? {});
      setMine(data.myReactions);
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'リアクションを送れませんでした');
    }
  }

  async function sendComment() {
    if (guest) {
      onNeedLogin();
      return;
    }
    if (!selected || !text.trim()) return;
    setSending(true);
    try {
      const comment = await api<Comment>('POST', `/api/pins/${encodeURIComponent(selected.pinId)}/comments`, {
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

  function selectMenu() {
    // TODO(API): 通報・非表示（B9）、自分のピンの位置の調整・編集・削除（B10）
    setMenu(false);
    flash(WAITING);
  }

  const month = currentMonth();
  const thisMonth = pins.filter((pin) => pin.createdAt.startsWith(month)).length;
  const isMine = selected ? myPinIds.includes(selected.pinId) : false;

  return (
    <main className="relative h-svh overflow-hidden">
      <MapSurface ref={holder} label="地図" />

      {mode === 'adjust' ? (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <MugMark label="立てるピン" className="h-[78px] w-14" />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] flex flex-col gap-2">
        {mode === 'adjust' ? (
          <div className="pointer-events-auto">
            <MapBanner icon={Move}>地図を動かして、刺された場所にピンを合わせてください</MapBanner>
          </div>
        ) : (
          <div className="pointer-events-auto flex gap-2">
            {location === 'loading' ? (
              <AreaCard title="現在地を取得中…" subtitle="しばらくお待ちください" />
            ) : (
              // TODO(API): エリア名（市町村）と危険度
              <AreaCard title="表示中のエリア" subtitle={`今月 ${thisMonth}件の刺されピン`} risk={null} />
            )}
            <RoundButton icon={User} label="マイページ" size="lg" onClick={onProfile} />
          </div>
        )}
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
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(49px+env(safe-area-inset-bottom)+16px)] flex flex-col items-end gap-4">
          <RoundButton
            icon={Navigation}
            label="現在地へ"
            className="pointer-events-auto"
            disabled={location !== 'on'}
            onClick={() => void locate(true)}
          />
          <div className="pointer-events-auto w-full">
            <SasaretaButton
              disabled={location !== 'on'}
              label={location === 'off' ? '位置情報がオフです' : 'ここで刺された！'}
              onClick={() => void startPost()}
            />
          </div>
        </div>
      ) : null}

      {mode === 'browse' ? <TabBar tab="map" onChange={onTab} /> : null}

      {mode === 'compose' ? (
        <PostPanel
          stamp={stamp}
          memo={memo}
          busy={posting}
          error={postError}
          onStamp={setStamp}
          onMemo={setMemo}
          onAdjust={() => setMode('adjust')}
          onCancel={() => setConfirmCancel(true)}
          onDone={() => void submitPost()}
        />
      ) : null}
      {mode === 'adjust' ? <AdjustPanel onCancel={() => setMode('compose')} onConfirm={confirmAdjust} /> : null}
      <ConfirmDialog
        open={confirmCancel}
        title="このピンを取り消しますか？"
        description="選んだスタンプとひとことも消えます。"
        confirmLabel="取り消す"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={cancelPost}
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
              placeholder={
                guest ? 'ログインするとコメントできます' : nickname ? `${nickname} としてコメント…` : 'コメント…'
              }
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
          onSelect={selectMenu}
          onCancel={() => setMenu(false)}
        />
      </BottomSheet>
    </main>
  );
}
