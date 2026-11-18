import { useState, type FormEvent } from 'react';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { NavBar } from '@/components/NavBar';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { authMessage, signUp } from '@/lib/auth';

type Props = { onBack: () => void; onCreated: (email: string, password: string) => void; onLogin: () => void };

// A2 アカウント作成
export function SignUpPage({ onBack, onCreated, onLogin }: Props) {
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
    <Screen>
      <NavBar backLabel="戻る" onBack={onBack} />
      <form className="flex flex-1 flex-col" onSubmit={submit}>
        <div className="flex flex-1 flex-col gap-5 px-4 pt-2">
          <PageTitle title="アカウント作成" description="メールアドレスとパスワードを入力してください。" />
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
            autoComplete="new-password"
            placeholder="8文字以上"
            minLength={8}
            required
            hint="8文字以上で、大文字・小文字・数字・記号をふくめてください"
            error={error}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 px-4 py-2">
          <MugButton type="submit" disabled={busy}>
            {busy ? '送信中' : '確認コードを送信'}
          </MugButton>
          <MugButton type="button" tone="plain" onClick={onLogin}>
            アカウントをお持ちの方はログイン
          </MugButton>
        </div>
      </form>
    </Screen>
  );
}
