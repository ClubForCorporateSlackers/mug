import { useState, type FormEvent } from 'react';
import { AppNotice } from '@/components/AppNotice';
import { CodeField } from '@/components/CodeField';
import { MugButton } from '@/components/MugButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { authMessage, confirmSignUp, resendCode, signIn } from '@/lib/auth';
import type { Session } from '@/lib/auth';

type Props = {
  email: string;
  password: string;
  onBack: () => void;
  onSignedIn: (session: Session) => void;
};

export function ConfirmPage({ email, password, onBack, onSignedIn }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(`${email} に6桁のコードを送りました`);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await confirmSignUp(email, code.trim());
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
      setInfo('確認コードを送り直しました');
    } catch (err) {
      setError(authMessage(err));
    }
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="確認コード" onBack={onBack} />
      <form className="flex flex-1 flex-col gap-4 px-4 pb-safe-6" onSubmit={submit}>
        <AppNotice>{info}</AppNotice>
        <CodeField label="6桁のコード" value={code} disabled={busy} invalid={Boolean(error)} onChange={setCode} />
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <div className="mt-auto flex flex-col gap-2">
          <MugButton type="submit" disabled={busy}>
            {busy ? '確認中' : 'アカウントを有効にする'}
          </MugButton>
          <MugButton type="button" variant="ghost" onClick={() => void resend()}>
            コードを再送する
          </MugButton>
        </div>
      </form>
    </main>
  );
}
