import { useState, type FormEvent } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { authMessage, signIn } from '@/lib/auth';
import type { Session } from '@/lib/auth';

type Props = {
  notice?: string;
  onBack: () => void;
  onSignedIn: (session: Session) => void;
  onSignUp: () => void;
  onReset: () => void;
  onConfirm: (email: string, password: string) => void;
};

export function LoginPage({ notice, onBack, onSignedIn, onSignUp, onReset, onConfirm }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSignedIn(await signIn(email.trim(), password));
    } catch (err) {
      const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
      if (code === 'UserNotConfirmedException') onConfirm(email.trim(), password);
      else setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="ログイン" onBack={onBack} />
      <form className="flex flex-1 flex-col gap-4 px-4 pb-6" onSubmit={submit}>
        {notice ? <AppNotice>{notice}</AppNotice> : null}
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="button" className="self-start text-sm font-bold text-primary" onClick={onReset}>
          パスワードをお忘れですか？
        </button>
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <div className="mt-auto flex flex-col gap-2">
          <MugButton type="submit" disabled={busy}>
            {busy ? 'ログイン中' : 'ログイン'}
          </MugButton>
          <MugButton type="button" variant="ghost" onClick={onSignUp}>
            アカウントを作る
          </MugButton>
        </div>
      </form>
    </main>
  );
}
