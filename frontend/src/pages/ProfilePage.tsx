import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { AppNotice } from '@/components/AppNotice';
import { BloodPicker } from '@/components/BloodPicker';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { BloodType, Profile } from '@/lib/types';

type Props = { idToken: string; onBack: () => void; onSaved: () => void };

export function ProfilePage({ idToken, onBack, onSaved }: Props) {
  const [nickname, setNickname] = useState('');
  const [blood, setBlood] = useState<BloodType>('A');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    api<Profile>('GET', '/api/me', { idToken })
      .then((profile) => {
        if (stop) return;
        setNickname(profile.nickname);
        setBlood(profile.bloodType);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) return;
        if (!stop) setError(err instanceof Error ? err.message : '読み込めませんでした');
      });
    return () => {
      stop = true;
    };
  }, [idToken]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api<Profile>('PUT', '/api/me', { idToken, body: { nickname: nickname.trim(), bloodType: blood } });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="プロフィール" onBack={onBack} />
      <form className="flex flex-1 flex-col gap-4 px-4 pb-6" onSubmit={submit}>
        <MugField
          label="ニックネーム"
          name="nickname"
          required
          minLength={1}
          maxLength={20}
          hint="1〜20文字。コメントとランキングに出ます。ピンは匿名のままです。"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">血液型</p>
          <BloodPicker value={blood} onChange={setBlood} />
          <p className="text-xs text-muted-foreground">ピンには出ません。市町村の集計にだけ使います。</p>
        </div>
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <div className="mt-auto">
          <MugButton type="submit" disabled={busy}>
            {busy ? '保存中' : '保存する'}
          </MugButton>
        </div>
      </form>
    </main>
  );
}
