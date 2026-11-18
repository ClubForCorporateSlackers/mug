import { useState, type FormEvent } from 'react';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { NavBar } from '@/components/NavBar';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { authMessage, forgotPassword } from '@/lib/auth';

type Props = { onBack: () => void; onSent: (email: string) => void };

// A6 パスワード再設定（メール入力）
export function ForgotPage({ onBack, onSent }: Props) {
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
    <Screen>
      <NavBar backLabel="戻る" onBack={onBack} />
      <form className="flex flex-1 flex-col" onSubmit={submit}>
        <div className="flex flex-1 flex-col gap-5 px-4 pt-2">
          <PageTitle title="パスワード再設定" description="登録したメールアドレスに確認コードを送ります。" />
          <MugField
            label="メールアドレス"
            type="email"
            autoComplete="email"
            placeholder="example@mail.com"
            required
            error={error}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="px-4 py-2">
          <MugButton type="submit" disabled={busy}>
            {busy ? '送信中' : '確認コードを送信'}
          </MugButton>
        </div>
      </form>
    </Screen>
  );
}
