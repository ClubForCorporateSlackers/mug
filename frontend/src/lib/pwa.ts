import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// 開いたままでも新しい版に気づけるよう、1時間ごとに確かめる
const UPDATE_CHECK_MS = 60 * 60 * 1000;

// Service Worker を登録し、新しい版が届いたかを返す（設定は vite.config.ts の VitePWA）
export function useAppUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => void registration.update(), UPDATE_CHECK_MS);
    },
  });
  return {
    needRefresh,
    update: () => void updateServiceWorker(true),
    dismiss: () => setNeedRefresh(false),
  };
}

// 電波がつながっているか。圏外のお知らせを出すのに使う
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
