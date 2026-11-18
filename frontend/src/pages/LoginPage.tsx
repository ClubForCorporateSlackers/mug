import { useState, type FormEvent } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { NavBar } from '@/components/NavBar';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { TextAction } from '@/components/TextAction';
import { authMessage, signIn, type Session } from '@/lib/auth';

type Props = {
  onBack: () => void;
  onSignedIn: (session: Session) => void;
  onSignUp: () => void;
  onForgot: () => void;
  onConfirm: (email: string, password: string) => void;
};

// A5 ログイン
export function LoginPage({ onBack, onSignedIn, onSignUp, onForgot, onConfirm }: Props) {
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
    <Screen>
      <NavBar backLabel="戻る" onBack={onBack} />
      <form className="flex flex-1 flex-col" onSubmit={submit}>
        <div className="flex flex-1 flex-col gap-5 px-4 pt-2">
          <PageTitle title="ログイン" />
          <MugField
            label="メールアドレス"
            type="email"
            autoComplete="email"
            placeholder="example@mail.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <MugField
            label="パスワード"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextAction strong className="self-start px-2" onClick={onForgot}>
            パスワードをお忘れですか？
          </TextAction>
          {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        </div>
        <div className="flex flex-col gap-2 px-4 py-2">
          <MugButton type="submit" disabled={busy}>
            {busy ? 'ログイン中' : 'ログイン'}
          </MugButton>
          <MugButton type="button" tone="plain" onClick={onSignUp}>
            アカウントを作成
          </MugButton>
        </div>
      </form>
    </Screen>
  );
}
