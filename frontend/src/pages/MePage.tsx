import { useEffect, useState } from 'react';
import { ChevronLeft, Crosshair, Droplet, LogOut, Pencil } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { MenuRow } from '@/components/MenuRow';
import { MugButton } from '@/components/MugButton';
import { SwitchRow } from '@/components/SwitchRow';
import { bloodLabel } from '@/lib/labels';
import type { LocationState } from '@/lib/location';
import type { TabName } from '@/lib/route';
import type { Profile } from '@/lib/types';

type Props = {
  idToken?: string;
  email?: string;
  location: LocationState;
  onTab: (tab: TabName) => void;
  onBack: () => void;
  onLogin: () => void;
  onEdit: () => void;
  locationBusy: boolean;
  onToggleLocation: (on: boolean) => void;
  onLogout: () => void;
};

export function MePage({
  idToken,
  email,
  location,
  onTab,
  onBack,
  onLogin,
  onEdit,
  locationBusy,
  onToggleLocation,
  onLogout,
}: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!idToken) return;
    let stop = false;
    api<Profile>('GET', '/api/me', { idToken })
      .then((data) => {
        if (!stop) setProfile(data);
      })
      .catch((err: unknown) => {
        if (stop) return;
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else setError(err instanceof Error ? err.message : '読み込めませんでした');
      });
    return () => {
      stop = true;
    };
  }, [idToken]);

  return (
    <main className="flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-4">
        <button type="button" className="flex items-center gap-1 self-start font-bold text-primary" onClick={onBack}>
          <ChevronLeft className="size-5" aria-hidden />
          マップ
        </button>
        <h1 className="text-3xl font-bold">マイページ</h1>
        {!idToken ? (
          <>
            <AppNotice>ログインすると、ニックネームと血液型を登録して投稿できます。</AppNotice>
            <MugButton onClick={onLogin}>ログイン</MugButton>
          </>
        ) : (
          <>
            <section className="flex items-center gap-3 rounded-3xl bg-card px-4 py-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-xl font-bold">
                {profile?.nickname.slice(0, 1) ?? '?'}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
                  {profile?.nickname ?? 'プロフィール未登録'}
                  {profile ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      <Droplet className="size-3" aria-hidden />
                      {bloodLabel(profile.bloodType)}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              </div>
            </section>
            {profile ? (
              <section className="rounded-3xl bg-card px-4 py-4 text-center">
                <p className="text-2xl font-bold">{profile.pinCount}</p>
                <p className="text-xs">これまでに立てたピン</p>
              </section>
            ) : null}
            <AppNotice>地図のピンは匿名です。自分の投稿だとわかるのは、この画面の件数だけです。</AppNotice>
            {missing ? <AppNotice tone="error">ニックネームがまだです。登録すると投稿できます。</AppNotice> : null}
            {error ? <AppNotice tone="error">{error}</AppNotice> : null}
            <section className="divide-y rounded-3xl bg-card">
              <MenuRow icon={Pencil} label={profile ? 'プロフィールを編集' : 'プロフィールを登録'} onClick={onEdit} />
              <SwitchRow
                icon={Crosshair}
                label="位置情報"
                note={location === 'on' ? '現在地からピンを立てられます' : 'オフの間はピンを立てられません'}
                checked={location === 'on'}
                disabled={locationBusy}
                onChange={onToggleLocation}
              />
              <MenuRow icon={LogOut} label="ログアウト" onClick={() => setConfirmLogout(true)} />
            </section>
          </>
        )}
      </div>
      <BottomNav tab="map" onChange={onTab} />
      {confirmLogout ? (
        <ConfirmSheet
          title="ログアウトしますか？"
          body="もう一度ログインすると、投稿やコメントができます。"
          confirmLabel="ログアウト"
          onConfirm={onLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      ) : null}
    </main>
  );
}
