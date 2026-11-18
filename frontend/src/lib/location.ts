export type LatLng = { lat: number; lng: number };

// on：現在地がわかっている / off：断られた・あとで / pending：まだ聞いていない・取得中
export type LocationState = 'on' | 'off' | 'pending';

const ASKED_KEY = 'mug.locationAsked';

export function getPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('この端末では位置情報を使えません'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export async function locationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}

export function wasAsked(): boolean {
  return localStorage.getItem(ASKED_KEY) === '1';
}

export function markAsked(): void {
  localStorage.setItem(ASKED_KEY, '1');
}
