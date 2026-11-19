import { useState, type FormEvent } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { authMessage, forgotPassword } from '@/lib/auth';

type Props = { onBack: () => void; onSent: (email: string) => void };

export function ResetPage({ onBack, onSent }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      onSent(email.trim());
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="パスワード再設定" onBack={onBack} />
      <form className="flex flex-1 flex-col gap-4 px-4 pb-6" onSubmit={submit}>
        <p className="text-sm">登録したメールアドレスに確認コードを送ります。</p>
        <MugField
          label="メールアドレス"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <MugButton className="mt-auto" type="submit" disabled={busy}>
          {busy ? '送信中' : '確認コードを送信'}
        </MugButton>
      </form>
    </main>
  );
}
