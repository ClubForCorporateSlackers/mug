import { useState, type FormEvent } from 'react';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { NavBar } from '@/components/NavBar';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { AppNotice } from '@/components/AppNotice';
import { authMessage, confirmPassword } from '@/lib/auth';

type Props = { email: string; onBack: () => void; onDone: () => void };

// A7 パスワード再設定（新しいパスワード）
export function ResetPage({ email, onBack, onDone }: Props) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await confirmPassword(email, code.trim(), password);
      onDone();
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <NavBar backLabel="戻る" onBack={onBack} />
      <form className="flex flex-1 flex-col" onSubmit={submit}>
        <div className="flex flex-1 flex-col gap-5 px-4 pt-2">
          <PageTitle
            title="新しいパスワード"
            description="メールに届いた確認コードと、新しいパスワードを入力してください。"
          />
          <MugField
            label="確認コード"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <MugField
            label="新しいパスワード"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            hint="8文字以上で、大文字・小文字・数字・記号をふくめてください"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        </div>
        <div className="px-4 py-2">
          <MugButton type="submit" disabled={busy}>
            {busy ? '変更中' : 'パスワードを変更'}
          </MugButton>
        </div>
      </form>
    </Screen>
  );
}
