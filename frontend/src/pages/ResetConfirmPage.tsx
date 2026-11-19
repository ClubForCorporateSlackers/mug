import { useState, type FormEvent } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { authMessage, confirmNewPassword } from '@/lib/auth';

type Props = { email: string; onBack: () => void; onDone: () => void };

export function ResetConfirmPage({ email, onBack, onDone }: Props) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await confirmNewPassword(email, code.trim(), password);
      onDone();
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="新しいパスワード" onBack={onBack} />
      <form className="flex flex-1 flex-col gap-4 px-4 pb-safe-6" onSubmit={submit}>
        <p className="text-sm">{email} に届いた6けたのコードと、新しいパスワードを入れてください。</p>
        <MugField
          label="確認コード"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <MugField
          label="新しいパスワード"
          name="new-password"
          type="password"
          autoComplete="new-password"
          hint="8文字以上。大文字・小文字・数字・記号"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <MugButton className="mt-auto" type="submit" disabled={busy}>
          {busy ? '変更中' : 'パスワードを変更'}
        </MugButton>
      </form>
    </main>
  );
}
