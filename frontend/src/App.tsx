import { useCallback, useEffect, useState } from 'react';
import { AppFrame } from '@/components/AppFrame';
import { MascotCircle } from '@/components/MascotCircle';
import { ApiError, api } from '@/lib/api';
import { DEMO_ENABLED, authMessage, currentSession, signInDemo, signOut, type Session } from '@/lib/auth';
import { locationState } from '@/lib/location';
import type { Route, TabName } from '@/lib/route';
import type { Profile } from '@/lib/types';
import { AboutPage } from '@/pages/AboutPage';
import { ConfirmPage } from '@/pages/ConfirmPage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { ForgotPage } from '@/pages/ForgotPage';
import { LocationPage } from '@/pages/LocationPage';
import { LoginPage } from '@/pages/LoginPage';
import { MapPage } from '@/pages/MapPage';
import { MePage } from '@/pages/MePage';
import { MyPinsPage } from '@/pages/MyPinsPage';
import { RankingPage } from '@/pages/RankingPage';
import { ResetPage } from '@/pages/ResetPage';
import { SetupPage } from '@/pages/SetupPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { WelcomePage } from '@/pages/WelcomePage';

// ログインのあとの行き先（Figma の「画面遷移・実装メモ」）
// プロフィール未登録 → A4、位置情報をまだ聞いていない → A8、それ以外 → マップ
async function nextAfterLogin(session: Session): Promise<Route> {
  try {
    await api<Profile>('GET', '/api/me', { idToken: session.idToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { name: 'setup' };
  }
  return (await locationState()) === 'prompt' ? { name: 'location' } : { name: 'map' };
}

function App() {
  const [route, setRoute] = useState<Route | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState('');

  useEffect(() => {
    void currentSession().then(async (session) =>
      setRoute(session ? await nextAfterLogin(session) : { name: 'welcome' }),
    );
  }, []);

  const enter = useCallback(async (session: Session) => setRoute(await nextAfterLogin(session)), []);
  // デモ用アカウントで本当にログインする（投稿やマイページも、そのまま本物の API で使える）
  const enterDemo = useCallback(async () => {
    setDemoBusy(true);
    setDemoError('');
    try {
      await enter(await signInDemo());
    } catch (err) {
      setDemoError(authMessage(err));
    } finally {
      setDemoBusy(false);
    }
  }, [enter]);
  const goTab = useCallback((tab: TabName) => setRoute({ name: tab } as Route), []);
  const afterSetup = useCallback(
    async () => setRoute((await locationState()) === 'prompt' ? { name: 'location' } : { name: 'map' }),
    [],
  );

  let page;
  if (!route) {
    page = (
      <div className="grid min-h-svh place-items-center">
        <MascotCircle size="md" />
      </div>
    );
  } else if (route.name === 'welcome') {
    page = (
      <WelcomePage
        onStart={() => setRoute({ name: 'signup' })}
        onLogin={() => setRoute({ name: 'login' })}
        onDemo={DEMO_ENABLED ? () => void enterDemo() : undefined}
        demoBusy={demoBusy}
        demoError={demoError}
      />
    );
  } else if (route.name === 'signup') {
    page = (
      <SignUpPage
        onBack={() => setRoute({ name: 'welcome' })}
        onLogin={() => setRoute({ name: 'login' })}
        onCreated={(email, password) => setRoute({ name: 'confirm', email, password })}
      />
    );
  } else if (route.name === 'confirm') {
    page = (
      <ConfirmPage
        email={route.email}
        password={route.password}
        onBack={() => setRoute({ name: 'signup' })}
        onSignedIn={(session) => void enter(session)}
      />
    );
  } else if (route.name === 'login') {
    page = (
      <LoginPage
        onBack={() => setRoute({ name: 'welcome' })}
        onSignedIn={(session) => void enter(session)}
        onSignUp={() => setRoute({ name: 'signup' })}
        onForgot={() => setRoute({ name: 'forgot' })}
        onConfirm={(email, password) => setRoute({ name: 'confirm', email, password })}
      />
    );
  } else if (route.name === 'forgot') {
    page = (
      <ForgotPage onBack={() => setRoute({ name: 'login' })} onSent={(email) => setRoute({ name: 'reset', email })} />
    );
  } else if (route.name === 'reset') {
    page = (
      <ResetPage
        email={route.email}
        onBack={() => setRoute({ name: 'forgot' })}
        onDone={() => setRoute({ name: 'login' })}
      />
    );
  } else if (route.name === 'setup') {
    page = <SetupPage onSaved={() => void afterSetup()} />;
  } else if (route.name === 'location') {
    page = <LocationPage onDone={() => setRoute({ name: 'map' })} />;
  } else if (route.name === 'ranking') {
    page = <RankingPage onTab={goTab} />;
  } else if (route.name === 'about') {
    page = <AboutPage onTab={goTab} />;
  } else if (route.name === 'me') {
    page = (
      <MePage
        onBack={() => setRoute({ name: 'map' })}
        onTab={goTab}
        onMyPins={() => setRoute({ name: 'myPins' })}
        onEdit={() => setRoute({ name: 'editProfile' })}
        onLogout={() => {
          signOut();
          setRoute({ name: 'welcome' });
        }}
      />
    );
  } else if (route.name === 'myPins') {
    page = <MyPinsPage onBack={() => setRoute({ name: 'me' })} onMap={() => setRoute({ name: 'map' })} />;
  } else if (route.name === 'editProfile') {
    page = <EditProfilePage onClose={() => setRoute({ name: 'me' })} />;
  } else {
    page = <MapPage onTab={goTab} onProfile={() => setRoute({ name: 'me' })} />;
  }

  return <AppFrame>{page}</AppFrame>;
}

export default App;
