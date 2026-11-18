export type LatLng = { lat: number; lng: number };

// on：現在地がわかっている / off：断られた・あとで / pending：まだ聞いていない・取得中
export type LocationState = 'on' | 'off' | 'pending';

const ASKED_KEY = 'mug.locationAsked';

function readPosition(options: PositionOptions): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('この端末では位置情報を使えません'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (err) => reject(err),
      options,
    );
  });
}

// GPS で取れないとき（PC や屋内で時間切れ）は、精度を下げてもう一度取る
export async function getPosition(): Promise<LatLng> {
  try {
    return await readPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  } catch (err) {
    if ((err as GeolocationPositionError | undefined)?.code === 1) throw err;
    return readPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }
}

// 歩いて動いたときも現在地の点がついてくるようにする。止めるときは返り値の関数を呼ぶ。
export function watchPosition(onChange: (position: LatLng) => void): () => void {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    (position) => onChange({ lat: position.coords.latitude, lng: position.coords.longitude }),
    () => {},
    { enableHighAccuracy: true, maximumAge: 10000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export async function locationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}

// マイページで「位置情報」をオフにしたか。オンかオフかだけを残し、位置は保存しない。
const OFF_KEY = 'mug.locationOff';

export function isLocationOff(): boolean {
  return localStorage.getItem(OFF_KEY) === '1';
}

export function setLocationOff(off: boolean): void {
  if (off) localStorage.setItem(OFF_KEY, '1');
  else localStorage.removeItem(OFF_KEY);
}

export function wasAsked(): boolean {
  return localStorage.getItem(ASKED_KEY) === '1';
}

export function markAsked(): void {
  localStorage.setItem(ASKED_KEY, '1');
}
