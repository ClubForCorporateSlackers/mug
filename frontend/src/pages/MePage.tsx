import { useEffect, useState } from 'react';
import { Crosshair, FileText, LogOut, MapPin, Pencil, Shield, Trash2 } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MenuGroup } from '@/components/MenuGroup';
import { MenuRow } from '@/components/MenuRow';
import { NavBar } from '@/components/NavBar';
import { PageTitle } from '@/components/PageTitle';
import { ProfileCard } from '@/components/ProfileCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/StatTile';
import { TabBar } from '@/components/TabBar';
import { api } from '@/lib/api';
import { currentSession, idToken, signOut } from '@/lib/auth';
import { bloodLabel, timeAgo } from '@/lib/labels';
import { locationState, type LocationState } from '@/lib/location';
import type { TabName } from '@/lib/route';
import type { Pin, Profile } from '@/lib/types';

const LOCATION_LABEL: Record<LocationState, string> = { granted: 'オン', prompt: '未設定', denied: 'オフ' };

type Props = {
  onBack: () => void;
  onTab: (tab: TabName) => void;
  onMyPins: () => void;
  onEdit: () => void;
  onLogout: () => void;
  onOpenPin: (pin: Pin) => void;
  // アカウントを消したあと（最初の画面へ）
  onDeleted: () => void;
};

// D1 マイページ（D5 ログアウト、D6 アカウント削除の確認を含む）
export function MePage({ onBack, onTab, onMyPins, onEdit, onLogout, onOpenPin, onDeleted }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myPins, setMyPins] = useState<Pin[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState<LocationState>('prompt');
  const [dialog, setDialog] = useState<'none' | 'logout' | 'delete'>('none');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setEmail((await currentSession())?.email ?? '');
        const token = await idToken();
        setProfile(await api<Profile>('GET', '/api/me', { idToken: token }));
        // 自分のピン（docs/api-spec.md の #12）
        setMyPins((await api<{ pins: Pin[] }>('GET', '/api/me/pins', { idToken: token })).pins);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : '読み込めませんでした');
      }
    })();
    void locationState().then(setLocation);
  }, []);

  // D6。DELETE /api/me（#17）でプロフィール・ピン・コメント・リアクションと Cognito のユーザーを消す
  async function deleteAccount() {
    setDialog('none');
    setDeleting(true);
    try {
      await api<{ ok: boolean }>('DELETE', '/api/me', { idToken: await idToken() });
      signOut();
      onDeleted();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'アカウントを削除できませんでした');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen withTabBar>
      <NavBar backLabel="マップ" onBack={onBack} />
      <div className="flex flex-col gap-4 px-4 pt-2 pb-6">
        <PageTitle title="マイページ" size="xl" />
        {profile ? (
          <ProfileCard
            nickname={profile.nickname}
            bloodLabel={profile.bloodType === 'UNKNOWN' ? undefined : bloodLabel(profile.bloodType)}
            email={email}
          />
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={profile?.monthCount !== undefined ? String(profile.monthCount) : '—'} label="今月の刺され" />
          <StatTile value={profile ? String(profile.pinCount) : '—'} label="これまで" />
          <StatTile
            value={profile?.odaijiReceived !== undefined ? String(profile.odaijiReceived) : '—'}
            label={'もらった\nお大事に'}
          />
        </div>
        <SectionHeader title="自分のピン" actionLabel="すべて見る" onAction={onMyPins} />
        <MenuGroup label="自分のピン">
          {myPins === null ? (
            <MenuRow icon={MapPin} label="読み込み中…" onClick={onMyPins} />
          ) : myPins.length === 0 ? (
            <MenuRow icon={MapPin} label="まだピンはありません" onClick={onMyPins} />
          ) : (
            myPins
              .slice(0, 2)
              .map((pin) => (
                <MenuRow
                  key={pin.pinId}
                  icon={MapPin}
                  label={pin.city || '場所不明'}
                  value={timeAgo(pin.createdAt)}
                  onClick={() => onOpenPin(pin)}
                />
              ))
          )}
        </MenuGroup>
        <MenuGroup label="設定">
          <MenuRow icon={Pencil} label="プロフィールを編集" onClick={onEdit} />
          <MenuRow
            icon={Crosshair}
            label="位置情報"
            value={LOCATION_LABEL[location]}
            onClick={() => setMessage('位置情報はブラウザの設定で変えられます')}
          />
          <MenuRow icon={FileText} label="利用規約" onClick={() => setMessage('利用規約は準備中です')} />
          <MenuRow
            icon={Shield}
            label="プライバシーポリシー"
            onClick={() => setMessage('プライバシーポリシーは準備中です')}
          />
        </MenuGroup>
        <MenuGroup label="アカウント">
          <MenuRow icon={LogOut} label="ログアウト" danger onClick={() => setDialog('logout')} />
          <MenuRow
            icon={Trash2}
            label={deleting ? '削除しています…' : 'アカウントを削除'}
            danger
            onClick={() => setDialog('delete')}
          />
        </MenuGroup>
        {message ? <AppNotice>{message}</AppNotice> : null}
      </div>
      <TabBar tab="map" onChange={onTab} />
      <ConfirmDialog
        open={dialog === 'logout'}
        title="ログアウトしますか？"
        description="もう一度使うときは、メールアドレスとパスワードでログインします。"
        confirmLabel="ログアウト"
        onCancel={() => setDialog('none')}
        onConfirm={onLogout}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title="アカウントを削除しますか？"
        description="投稿したピン・コメント・リアクションもすべて削除され、元に戻せません。"
        confirmLabel="削除する"
        onCancel={() => setDialog('none')}
        onConfirm={() => void deleteAccount()}
      />
    </Screen>
  );
}
