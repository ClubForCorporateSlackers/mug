// ブラウザの位置情報。許可の状態を調べる・現在地を取る

export type LocationState = 'granted' | 'prompt' | 'denied';

export async function locationState(): Promise<LocationState> {
  if (!navigator.geolocation) return 'denied';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    // Safari の古い版など、調べられないときは「まだ聞いていない」として扱う
    return 'prompt';
  }
}

export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('この端末では位置情報が使えません'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}
