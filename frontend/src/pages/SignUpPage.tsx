import { useState, type FormEvent } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { authMessage, signUp } from '@/lib/auth';

type Props = {
  onBack: () => void;
  onCreated: (email: string, password: string) => void;
};

export function SignUpPage({ onBack, onCreated }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signUp(email.trim(), password);
      onCreated(email.trim(), password);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="アカウント作成" onBack={onBack} />
      <form className="flex flex-1 flex-col gap-4 px-4 pb-safe-6" onSubmit={submit}>
        <MugField
          label="メールアドレス"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <MugField
          label="パスワード"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="8文字以上。大文字・小文字・数字・記号"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <div className="mt-auto">
          <MugButton type="submit" disabled={busy}>
            {busy ? '送信中' : '確認コードを送る'}
          </MugButton>
        </div>
      </form>
    </main>
  );
}
