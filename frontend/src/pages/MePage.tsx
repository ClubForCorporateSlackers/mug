import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { AppNotice } from '@/components/AppNotice';
import { BottomNav } from '@/components/BottomNav';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { bloodLabel } from '@/lib/labels';
import type { TabName } from '@/lib/route';
import type { Profile } from '@/lib/types';

type Props = {
  tab: TabName;
  idToken?: string;
  email?: string;
  onTab: (tab: TabName) => void;
  onLogin: () => void;
  onEdit: () => void;
  onLogout: () => void;
};

export function MePage({ tab, idToken, email, onTab, onLogin, onEdit, onLogout }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

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
      <ScreenHeader title="自分" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
        {!idToken ? (
          <>
            <AppNotice>ログインすると、ニックネームと血液型を登録できます。</AppNotice>
            <MugButton onClick={onLogin}>ログイン</MugButton>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <MugMark className="size-16" />
              <div>
                <p className="text-lg font-bold">{profile?.nickname ?? 'プロフィール未登録'}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
                {profile ? (
                  <p className="text-sm">
                    {bloodLabel(profile.bloodType)} · 投稿 {profile.pinCount}件
                  </p>
                ) : null}
              </div>
            </div>
            <AppNotice>自分の投稿だとわかるのは、この画面の件数だけです。地図では匿名のままです。</AppNotice>
            {missing ? <AppNotice tone="error">ニックネームがまだです。登録すると投稿できます。</AppNotice> : null}
            {error ? <AppNotice tone="error">{error}</AppNotice> : null}
            <MugButton onClick={onEdit}>{profile ? 'プロフィールを変更' : 'プロフィールを登録'}</MugButton>
            <MugButton variant="outline" onClick={onLogout}>
              ログアウト
            </MugButton>
          </>
        )}
      </div>
      <BottomNav tab={tab} onChange={onTab} />
    </main>
  );
}
