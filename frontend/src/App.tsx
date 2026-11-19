import { useCallback, useEffect, useRef, useState } from 'react';
import { MugMark } from '@/components/MugMark';
import { ApiError, api } from '@/lib/api';
import { currentSession, signOut, type Session } from '@/lib/auth';
import {
  getPosition,
  isLocationOff,
  locationPermission,
  markAsked,
  setLocationOff,
  wasAsked,
  watchPosition,
  type LatLng,
  type LocationState,
} from '@/lib/location';
import type { Route, TabName } from '@/lib/route';
import type { Pin, Profile } from '@/lib/types';
import { AboutPage } from '@/pages/AboutPage';
import { ConfirmPage } from '@/pages/ConfirmPage';
import { LocationPage } from '@/pages/LocationPage';
import { LoginPage } from '@/pages/LoginPage';
import { MapPage } from '@/pages/MapPage';
import { MePage } from '@/pages/MePage';
import { PinSheet } from '@/pages/PinSheet';
import { ProfilePage } from '@/pages/ProfilePage';
import { RankingPage } from '@/pages/RankingPage';
import { ResetConfirmPage } from '@/pages/ResetConfirmPage';
import { ResetPage } from '@/pages/ResetPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { SplashPage } from '@/pages/SplashPage';

const PASSWORD_CHANGED = 'パスワードを変更しました。新しいパスワードでログインしてください';
const LOCATION_BLOCKED = 'ブラウザの設定で、このサイトの位置情報を許可してください';

function App() {
  const [route, setRoute] = useState<Route>({ name: 'splash' });
  // たどってきた画面（「戻る」で1つ前に戻るため）。下のタブの切り替えと、ログイン・登録が終わったときに空にする
  const [history, setHistory] = useState<Route[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [location, setLocation] = useState<LocationState>('pending');
  const [locationHint, setLocationHint] = useState('');
  const [asking, setAsking] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [pinsVersion, setPinsVersion] = useState(0);
  // この画面を開いているあいだに立てたピン。投稿の直後の読み直しには、まだ入っていないことがあるので、地図に足して描く
  const [postedPins, setPostedPins] = useState<Pin[]>([]);
  const locationDecided = useRef(false);

  const requestLocation = useCallback(async () => {
    setAsking(true);
    markAsked();
    setLocationOff(false);
    try {
      setPosition(await getPosition());
      setLocation('on');
      setLocationHint('');
    } catch {
      setLocation('off');
      setLocationHint(LOCATION_BLOCKED);
    } finally {
      setAsking(false);
    }
  }, []);

  useEffect(() => {
    if (location !== 'on') return;
    return watchPosition(setPosition);
  }, [location]);

  // 地図に入る前に、位置情報の許可を聞くか（A8）を決める
  const goMap = useCallback(async () => {
    if (locationDecided.current) {
      setRoute({ name: 'map' });
      return;
    }
    if (isLocationOff()) {
      locationDecided.current = true;
      setRoute({ name: 'map' });
      setLocation('off');
      return;
    }
    const state = await locationPermission();
    if (state === 'prompt' && !wasAsked()) {
      setRoute({ name: 'locate' });
      return;
    }
    locationDecided.current = true;
    setRoute({ name: 'map' });
    // iPhone の Safari は許可したあとも 'prompt' を返すことがあるので、断られたとき以外は毎回取りに行く
    if (state === 'denied') {
      setLocation('off');
      setLocationHint(LOCATION_BLOCKED);
    } else void requestLocation();
  }, [requestLocation]);

  const go = useCallback(
    (next: Route) => {
      if (next.name === 'map') void goMap();
      else setRoute(next);
    },
    [goMap],
  );

  // 次の画面へ進む（今の画面を履歴に積む）
  function push(next: Route) {
    setHistory((list) => [...list, route]);
    setRoute(next);
  }

  // 1つ前の画面に戻る。履歴がなければ fallback へ
  function back(fallback: () => void) {
    const previous = history[history.length - 1];
    if (!previous) {
      fallback();
      return;
    }
    setHistory(history.slice(0, -1));
    setRoute(previous);
  }

  useEffect(() => {
    currentSession().then((value) => {
      setSession(value);
      if (value) void goMap();
      setReady(true);
    });
  }, [goMap]);

  const enter = useCallback(
    async (nextSession: Session, next?: Route) => {
      setSession(nextSession);
      // ログイン・登録が終わったら、ログインの画面たちには戻らない
      setHistory([]);
      const destination = next ?? { name: 'map' };
      try {
        await api<Profile>('GET', '/api/me', { idToken: nextSession.idToken });
        go(destination);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setRoute({ name: 'profile', next: destination });
        else go(destination);
      }
    },
    [go],
  );

  const goTab = useCallback(
    (tab: TabName) => {
      setHistory([]);
      if (tab === 'ranking') setRoute({ name: 'ranking' });
      else if (tab === 'about') setRoute({ name: 'about' });
      else go({ name: 'map' });
    },
    [go],
  );

  // 「ここで刺された！」を押したら、その場で現在地にピンを立てる
  async function postHere() {
    if (location !== 'on' || !position || posting) return;
    if (!session) {
      push({ name: 'login', next: { name: 'map' } });
      return;
    }
    setPosting(true);
    setPostError('');
    try {
      const pin = await api<Pin>('POST', '/api/pins', {
        idToken: session.idToken,
        body: { lat: position.lat, lng: position.lng, stamp: null, memo: '' },
      });
      setPostedPins((list) => [...list, pin]);
      setPinsVersion((value) => value + 1);
      push({ name: 'pin', pin });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PROFILE_REQUIRED') push({ name: 'profile', next: { name: 'map' } });
      else if (err instanceof ApiError && err.status === 401) push({ name: 'login', next: { name: 'map' } });
      else setPostError(err instanceof Error ? err.message : 'ピンを立てられませんでした');
    } finally {
      setPosting(false);
    }
  }

  function decideLocation(allow: boolean) {
    locationDecided.current = true;
    if (allow) {
      void requestLocation().then(() => setRoute({ name: 'map' }));
    } else {
      markAsked();
      setLocation('off');
      setRoute({ name: 'map' });
    }
  }

  function toggleLocation(on: boolean) {
    if (on) {
      void requestLocation();
      return;
    }
    setLocationOff(true);
    setLocation('off');
    setPosition(null);
    setLocationHint('');
  }

  function logout() {
    signOut();
    setSession(null);
    setHistory([]);
    setRoute({ name: 'splash' });
  }

  if (!ready) {
    return (
      <div className="mx-auto grid min-h-svh w-full max-w-[430px] place-items-center">
        <MugMark className="size-24" />
      </div>
    );
  }

  let page;
  if (route.name === 'splash') {
    page = <SplashPage onStart={() => push({ name: 'signup' })} onLogin={() => push({ name: 'login' })} />;
  } else if (route.name === 'locate') {
    page = <LocationPage busy={asking} onAllow={() => decideLocation(true)} onLater={() => decideLocation(false)} />;
  } else if (route.name === 'login') {
    page = (
      <LoginPage
        notice={route.notice}
        onBack={() =>
          back(() => {
            const next = route.next;
            if (!next) setRoute({ name: 'splash' });
            else go(next);
          })
        }
        onSignedIn={(value) => void enter(value, route.next)}
        onSignUp={() => push({ name: 'signup', next: route.next })}
        onReset={() => push({ name: 'reset', next: route.next })}
        onConfirm={(email, password) => push({ name: 'confirm', email, password, next: route.next })}
      />
    );
  } else if (route.name === 'signup') {
    page = (
      <SignUpPage
        onBack={() => back(() => setRoute({ name: 'splash' }))}
        onCreated={(email, password) => push({ name: 'confirm', email, password, next: route.next })}
      />
    );
  } else if (route.name === 'confirm') {
    page = (
      <ConfirmPage
        email={route.email}
        password={route.password}
        onBack={() => back(() => setRoute({ name: 'signup', next: route.next }))}
        onSignedIn={(value) => void enter(value, route.next)}
      />
    );
  } else if (route.name === 'reset') {
    page = (
      <ResetPage
        onBack={() => back(() => setRoute({ name: 'login', next: route.next }))}
        onSent={(email) => push({ name: 'resetConfirm', email, next: route.next })}
      />
    );
  } else if (route.name === 'resetConfirm') {
    page = (
      <ResetConfirmPage
        email={route.email}
        onBack={() => back(() => setRoute({ name: 'reset', next: route.next }))}
        onDone={() => {
          // 再設定の2つの画面は飛ばして、もとのログインの画面に戻る（そこから「戻る」でさらに前へ）
          const at = history.findLastIndex((item) => item.name === 'login');
          setHistory(at >= 0 ? history.slice(0, at) : []);
          setRoute({ name: 'login', next: route.next, notice: PASSWORD_CHANGED });
        }}
      />
    );
  } else if (route.name === 'profile' && session) {
    page = (
      <ProfilePage
        idToken={session.idToken}
        onBack={() => back(() => go({ name: 'map' }))}
        onSaved={() => {
          // マイページから編集したときはマイページへ。初めての登録のときは次の画面へ
          if (history.length > 0) back(() => undefined);
          else go(route.next ?? { name: 'map' });
        }}
      />
    );
  } else if (route.name === 'ranking') {
    page = <RankingPage tab="ranking" onTab={goTab} />;
  } else if (route.name === 'about') {
    page = <AboutPage tab="about" onTab={goTab} />;
  } else if (route.name === 'me') {
    page = (
      <MePage
        idToken={session?.idToken}
        email={session?.email}
        location={location}
        onTab={goTab}
        onBack={() => back(() => go({ name: 'map' }))}
        onLogin={() => push({ name: 'login', next: { name: 'me' } })}
        onEdit={() => {
          if (session) push({ name: 'profile', next: { name: 'me' } });
          else push({ name: 'login', next: { name: 'me' } });
        }}
        locationBusy={asking}
        onToggleLocation={toggleLocation}
        onLogout={logout}
      />
    );
  } else {
    page = (
      <MapPage
        tab="map"
        position={position}
        location={location}
        locationHint={locationHint}
        onTab={goTab}
        posting={posting}
        postError={postError}
        pinsVersion={pinsVersion}
        postedPins={postedPins}
        onPost={() => void postHere()}
        onOpenPin={(pin) => push({ name: 'pin', pin })}
        onMe={() => push({ name: 'me' })}
        onAllowLocation={() => void requestLocation()}
      >
        {route.name === 'pin' ? (
          <PinSheet
            key={route.pin.pinId}
            pin={route.pin}
            idToken={session?.idToken}
            onClose={() => back(() => setRoute({ name: 'map' }))}
            onNeedLogin={() => push({ name: 'login', next: route })}
          />
        ) : null}
      </MapPage>
    );
  }

  return <div className="mx-auto w-full max-w-[430px]">{page}</div>;
}

export default App;
