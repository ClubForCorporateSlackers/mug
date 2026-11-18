import { useEffect, useState, type FormEvent } from 'react';
import { CodeField } from '@/components/CodeField';
import { MugButton } from '@/components/MugButton';
import { NavBar } from '@/components/NavBar';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { AppNotice } from '@/components/AppNotice';
import { authMessage, confirmSignUp, resendCode, signIn, type Session } from '@/lib/auth';

type Props = { email: string; password: string; onBack: () => void; onSignedIn: (session: Session) => void };

const WAIT_SECONDS = 60;

// A3 確認コード入力
export function ConfirmPage({ email, password, onBack, onSignedIn }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(WAIT_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await confirmSignUp(email, code);
      onSignedIn(await signIn(email, password));
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    try {
      await resendCode(email);
      setWait(WAIT_SECONDS);
    } catch (err) {
      setError(authMessage(err));
    }
  }

  return (
    <Screen>
      <NavBar backLabel="戻る" onBack={onBack} />
      <form className="flex flex-1 flex-col" onSubmit={submit}>
        <div className="flex flex-1 flex-col gap-5 px-4 pt-2">
          <PageTitle title="確認コードを入力" description={`${email} に届いた6桁のコードを入力してください。`} />
          <CodeField label="確認コード（6桁）" value={code} onChange={setCode} />
          {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        </div>
        <div className="flex flex-col gap-2 px-4 py-2">
          <MugButton type="submit" disabled={busy || code.length < 6}>
            {busy ? '確認中' : '認証する'}
          </MugButton>
          <MugButton type="button" tone="plain" disabled={wait > 0} onClick={() => void resend()}>
            {wait > 0 ? `コードを再送する（${wait}秒後）` : 'コードを再送する'}
          </MugButton>
        </div>
      </form>
    </Screen>
  );
}
