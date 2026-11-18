import { useState, type FormEvent } from 'react';
import { BloodPicker } from '@/components/BloodPicker';
import { FormCard } from '@/components/FormCard';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { MugMark } from '@/components/MugMark';
import { Screen } from '@/components/Screen';
import { AppNotice } from '@/components/AppNotice';
import { api } from '@/lib/api';
import { idToken } from '@/lib/auth';
import type { BloodType, Profile } from '@/lib/types';

type Props = { onSaved: () => void };

// A4 プロフィール登録（初めて使うとき）
export function SetupPage({ onSaved }: Props) {
  const [nickname, setNickname] = useState('');
  const [blood, setBlood] = useState<BloodType | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!blood) {
      setError('血液型を選んでください（答えたくないときは「答えない」）');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api<Profile>('PUT', '/api/me', {
        idToken: await idToken(),
        body: { nickname: nickname.trim(), bloodType: blood },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen tone="brand">
      <form className="flex flex-1 flex-col items-center gap-4 px-4 pt-6" onSubmit={submit}>
        <MugMark className="h-[116px] w-[83px]" />
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[28px] leading-[38px] font-bold">あと少しで完了！</h1>
          <p className="text-[15px] font-medium text-muted-foreground">ニックネームと血液型を登録しましょう</p>
        </div>
        <FormCard>
          <MugField
            label="ニックネーム"
            placeholder="例：かゆみ太郎"
            required
            maxLength={20}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
          <div className="flex flex-col gap-2">
            <p className="text-[15px] leading-[22px] font-bold">血液型</p>
            <BloodPicker value={blood} onChange={setBlood} />
          </div>
          <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
            ニックネームはコメントやランキングに表示されます。ピンの投稿は匿名です。
          </p>
        </FormCard>
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <MugButton type="submit" disabled={busy}>
          {busy ? '保存中' : 'はじめる'}
        </MugButton>
      </form>
    </Screen>
  );
}
