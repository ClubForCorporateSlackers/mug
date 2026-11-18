import { useEffect, useState } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { BloodPicker } from '@/components/BloodPicker';
import { InitialAvatar } from '@/components/InitialAvatar';
import { MugField } from '@/components/MugField';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { TextAction } from '@/components/TextAction';
import { api } from '@/lib/api';
import { currentSession, idToken } from '@/lib/auth';
import type { BloodType, Profile } from '@/lib/types';

type Props = { onClose: () => void };

// D4 プロフィール編集
export function EditProfilePage({ onClose }: Props) {
  const [nickname, setNickname] = useState('');
  const [blood, setBlood] = useState<BloodType | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setEmail((await currentSession())?.email ?? '');
        const profile = await api<Profile>('GET', '/api/me', { idToken: await idToken() });
        setNickname(profile.nickname);
        setBlood(profile.bloodType);
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込めませんでした');
      }
    })();
  }, []);

  async function save() {
    if (!blood || !nickname.trim()) {
      setError('ニックネームと血液型を入力してください');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api<Profile>('PUT', '/api/me', {
        idToken: await idToken(),
        body: { nickname: nickname.trim(), bloodType: blood },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <NavBar
        title="プロフィール編集"
        leading={<TextAction onClick={onClose}>キャンセル</TextAction>}
        trailing={
          <TextAction strong disabled={busy} onClick={() => void save()}>
            保存
          </TextAction>
        }
      />
      <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
        <div className="flex justify-center">
          <InitialAvatar name={nickname} size="lg" />
        </div>
        <MugField
          label="ニックネーム"
          maxLength={20}
          required
          hint="コメントやランキングに表示されます（20文字まで）"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
        <div className="flex flex-col gap-2">
          <p className="text-[15px] leading-[22px] font-bold">血液型</p>
          <BloodPicker value={blood} onChange={setBlood} />
        </div>
        <MugField label="メールアドレス" value={email} disabled readOnly hint="メールアドレスは変更できません" />
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
      </div>
    </Screen>
  );
}
