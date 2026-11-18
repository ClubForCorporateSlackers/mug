import { useCallback, useEffect, useRef, useState } from 'react';
import { MugMark } from '@/components/MugMark';
import { ApiError, api } from '@/lib/api';
import { currentSession, signOut, type Session } from '@/lib/auth';
import { getPosition, locationPermission, markAsked, wasAsked, type LatLng, type LocationState } from '@/lib/location';
import type { Route, TabName } from '@/lib/route';
import type { Pin, Profile } from '@/lib/types';
import { AboutPage } from '@/pages/AboutPage';
import { ComposePage } from '@/pages/ComposePage';
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
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [location, setLocation] = useState<LocationState>('pending');
  const [locationHint, setLocationHint] = useState('');
  const [asking, setAsking] = useState(false);
  const locationDecided = useRef(false);

  const requestLocation = useCallback(async () => {
    setAsking(true);
    markAsked();
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

  // 地図に入る前に、位置情報の許可を聞くか（A8）を決める
  const goMap = useCallback(async () => {
    if (locationDecided.current) {
      setRoute({ name: 'map' });
      return;
    }
    const state = await locationPermission();
    if (state === 'prompt' && !wasAsked()) {
      setRoute({ name: 'locate' });
      return;
    }
    locationDecided.current = true;
    setRoute({ name: 'map' });
    if (state === 'denied' || (state === 'prompt' && wasAsked())) setLocation('off');
    else void requestLocation();
  }, [requestLocation]);

  const go = useCallback(
    (next: Route) => {
      if (next.name === 'map') void goMap();
      else setRoute(next);
    },
    [goMap],
  );

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
      if (tab === 'ranking') setRoute({ name: 'ranking' });
      else if (tab === 'about') setRoute({ name: 'about' });
      else go({ name: 'map' });
    },
    [go],
  );

  async function openCompose() {
    if (location !== 'on') return;
    if (!session) {
      setRoute({ name: 'login', next: { name: 'compose' } });
      return;
    }
    try {
      await api<Profile>('GET', '/api/me', { idToken: session.idToken });
      setRoute({ name: 'compose' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setRoute({ name: 'profile', next: { name: 'compose' } });
      else setRoute({ name: 'compose' });
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

  function logout() {
    signOut();
    setSession(null);
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
    page = <SplashPage onStart={() => void goMap()} onLogin={() => setRoute({ name: 'login' })} />;
  } else if (route.name === 'locate') {
    page = <LocationPage busy={asking} onAllow={() => decideLocation(true)} onLater={() => decideLocation(false)} />;
  } else if (route.name === 'login') {
    page = (
      <LoginPage
        notice={route.notice}
        onBack={() => {
          const next = route.next;
          if (!next) setRoute({ name: 'splash' });
          else if (next.name === 'compose') go({ name: 'map' });
          else go(next);
        }}
        onSignedIn={(value) => void enter(value, route.next)}
        onSignUp={() => setRoute({ name: 'signup', next: route.next })}
        onReset={() => setRoute({ name: 'reset', next: route.next })}
        onConfirm={(email, password) => setRoute({ name: 'confirm', email, password, next: route.next })}
      />
    );
  } else if (route.name === 'signup') {
    page = (
      <SignUpPage
        onBack={() => setRoute({ name: 'login', next: route.next })}
        onCreated={(email, password) => setRoute({ name: 'confirm', email, password, next: route.next })}
      />
    );
  } else if (route.name === 'confirm') {
    page = (
      <ConfirmPage
        email={route.email}
        password={route.password}
        onBack={() => setRoute({ name: 'signup', next: route.next })}
        onSignedIn={(value) => void enter(value, route.next)}
      />
    );
  } else if (route.name === 'reset') {
    page = (
      <ResetPage
        onBack={() => setRoute({ name: 'login', next: route.next })}
        onSent={(email) => setRoute({ name: 'resetConfirm', email, next: route.next })}
      />
    );
  } else if (route.name === 'resetConfirm') {
    page = (
      <ResetConfirmPage
        email={route.email}
        onBack={() => setRoute({ name: 'reset', next: route.next })}
        onDone={() => setRoute({ name: 'login', next: route.next, notice: PASSWORD_CHANGED })}
      />
    );
  } else if (route.name === 'profile' && session) {
    page = (
      <ProfilePage
        idToken={session.idToken}
        onBack={() => go({ name: 'map' })}
        onSaved={() => go(route.next ?? { name: 'map' })}
      />
    );
  } else if (route.name === 'compose' && session && position) {
    page = (
      <ComposePage
        idToken={session.idToken}
        start={position}
        onBack={() => go({ name: 'map' })}
        onPosted={(pin: Pin) => setRoute({ name: 'pin', pin })}
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
        onBack={() => go({ name: 'map' })}
        onLogin={() => setRoute({ name: 'login', next: { name: 'me' } })}
        onEdit={() => {
          if (session) setRoute({ name: 'profile', next: { name: 'me' } });
          else setRoute({ name: 'login', next: { name: 'me' } });
        }}
        onAllowLocation={() => void requestLocation()}
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
        onCompose={() => void openCompose()}
        onOpenPin={(pin) => setRoute({ name: 'pin', pin })}
        onMe={() => setRoute({ name: 'me' })}
        onAllowLocation={() => void requestLocation()}
      >
        {route.name === 'pin' ? (
          <PinSheet
            key={route.pin.pinId}
            pin={route.pin}
            idToken={session?.idToken}
            onClose={() => setRoute({ name: 'map' })}
            onNeedLogin={() => setRoute({ name: 'login', next: route })}
          />
        ) : null}
      </MapPage>
    );
  }

  return <div className="mx-auto w-full max-w-[430px]">{page}</div>;
}

export default App;
