import { useCallback, useEffect, useState } from 'react';
import { MugMark } from '@/components/MugMark';
import { ApiError, api } from '@/lib/api';
import { currentSession, signOut, type Session } from '@/lib/auth';
import type { Route, TabName } from '@/lib/route';
import type { Pin, Profile } from '@/lib/types';
import { AboutPage } from '@/pages/AboutPage';
import { ComposePage } from '@/pages/ComposePage';
import { ConfirmPage } from '@/pages/ConfirmPage';
import { LoginPage } from '@/pages/LoginPage';
import { MapPage } from '@/pages/MapPage';
import { MePage } from '@/pages/MePage';
import { PinPage } from '@/pages/PinPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RankingPage } from '@/pages/RankingPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { SplashPage } from '@/pages/SplashPage';

function App() {
  const [route, setRoute] = useState<Route>({ name: 'splash' });
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    currentSession().then((value) => {
      setSession(value);
      if (value) setRoute({ name: 'map' });
      setReady(true);
    });
  }, []);

  const enter = useCallback(async (nextSession: Session, next?: Route) => {
    setSession(nextSession);
    const destination = next ?? { name: 'map' };
    try {
      await api<Profile>('GET', '/api/me', { idToken: nextSession.idToken });
      setRoute(destination);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setRoute({ name: 'profile', next: destination });
      else setRoute(destination);
    }
  }, []);

  const goTab = useCallback((tab: TabName) => {
    if (tab === 'ranking') setRoute({ name: 'ranking' });
    else if (tab === 'about') setRoute({ name: 'about' });
    else if (tab === 'me') setRoute({ name: 'me' });
    else setRoute({ name: 'map' });
  }, []);

  async function openCompose() {
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

  function logout() {
    signOut();
    setSession(null);
    setRoute({ name: 'splash' });
  }

  if (!ready) {
    return (
      <div className="mx-auto grid min-h-svh w-full max-w-md place-items-center">
        <MugMark className="size-24" />
      </div>
    );
  }

  let page;
  if (route.name === 'splash') {
    page = <SplashPage onStart={() => setRoute({ name: 'map' })} onLogin={() => setRoute({ name: 'login' })} />;
  } else if (route.name === 'login') {
    page = (
      <LoginPage
        onBack={() => {
          const next = route.next;
          if (!next || next.name === 'compose') setRoute(next ? { name: 'map' } : { name: 'splash' });
          else setRoute(next);
        }}
        onSignedIn={(value) => void enter(value, route.next)}
        onSignUp={() => setRoute({ name: 'signup', next: route.next })}
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
  } else if (route.name === 'profile' && session) {
    page = (
      <ProfilePage
        idToken={session.idToken}
        onBack={() => setRoute({ name: 'map' })}
        onSaved={() => setRoute(route.next ?? { name: 'map' })}
      />
    );
  } else if (route.name === 'compose' && session) {
    page = (
      <ComposePage
        idToken={session.idToken}
        onBack={() => setRoute({ name: 'map' })}
        onPosted={(pin: Pin) => setRoute({ name: 'pin', pin })}
      />
    );
  } else if (route.name === 'pin') {
    page = (
      <PinPage
        pin={route.pin}
        idToken={session?.idToken}
        onBack={() => setRoute({ name: 'map' })}
        onNeedLogin={() => setRoute({ name: 'login', next: route })}
      />
    );
  } else if (route.name === 'ranking') {
    page = <RankingPage tab="ranking" onTab={goTab} />;
  } else if (route.name === 'about') {
    page = <AboutPage tab="about" onTab={goTab} />;
  } else if (route.name === 'me') {
    page = (
      <MePage
        tab="me"
        idToken={session?.idToken}
        email={session?.email}
        onTab={goTab}
        onLogin={() => setRoute({ name: 'login', next: { name: 'me' } })}
        onEdit={() => {
          if (session) setRoute({ name: 'profile', next: { name: 'me' } });
          else setRoute({ name: 'login', next: { name: 'me' } });
        }}
        onLogout={logout}
      />
    );
  } else {
    page = (
      <MapPage
        tab="map"
        onTab={goTab}
        onCompose={() => void openCompose()}
        onOpenPin={(pin) => setRoute({ name: 'pin', pin })}
      />
    );
  }

  return <div className="mx-auto w-full max-w-md">{page}</div>;
}

export default App;
