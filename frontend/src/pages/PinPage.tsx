import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { AppNotice } from '@/components/AppNotice';
import { CommentList } from '@/components/CommentList';
import { MugButton } from '@/components/MugButton';
import { MugField } from '@/components/MugField';
import { ReactionBar } from '@/components/ReactionBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatWhen, stampLabel } from '@/lib/labels';
import type { Comment, Pin, ReactionType } from '@/lib/types';

type Props = {
  pin: Pin;
  idToken?: string;
  onBack: () => void;
  onNeedLogin: () => void;
};

type ReactionResponse = { reactions: Pin['reactions']; myReactions: ReactionType[] };

export function PinPage({ pin, idToken, onBack, onNeedLogin }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [counts, setCounts] = useState(pin.reactions ?? {});
  const [mine, setMine] = useState<ReactionType[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    api<{ comments: Comment[] }>('GET', `/api/pins/${encodeURIComponent(pin.pinId)}/comments`)
      .then((data) => {
        if (!stop) setComments(data.comments);
      })
      .catch((err: unknown) => {
        if (!stop) setError(err instanceof Error ? err.message : 'コメントを読み込めませんでした');
      });
    return () => {
      stop = true;
    };
  }, [pin.pinId]);

  async function toggle(type: ReactionType) {
    if (!idToken) {
      onNeedLogin();
      return;
    }
    setError('');
    const method = mine.includes(type) ? 'DELETE' : 'PUT';
    try {
      const data = await api<ReactionResponse>(method, `/api/pins/${encodeURIComponent(pin.pinId)}/reactions/${type}`, {
        idToken,
      });
      setCounts(data.reactions ?? {});
      setMine(data.myReactions);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onNeedLogin();
      else setError(err instanceof Error ? err.message : 'スタンプを送れませんでした');
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!idToken) {
      onNeedLogin();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const comment = await api<Comment>('POST', `/api/pins/${encodeURIComponent(pin.pinId)}/comments`, {
        idToken,
        body: { text: text.trim() },
      });
      setComments((prev) => [...prev, comment]);
      setText('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onNeedLogin();
      else setError(err instanceof Error ? err.message : 'コメントを送れませんでした');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="ピン" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-6">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold">匿名</p>
          <p className="text-sm text-muted-foreground">{formatWhen(pin.createdAt)}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {pin.city} · 半径100m以内 · {stampLabel(pin.stamp)}
        </p>
        {pin.memo ? <p className="whitespace-pre-wrap">{pin.memo}</p> : null}
        <ReactionBar counts={counts} mine={mine} onToggle={(type) => void toggle(type)} />
        <CommentList comments={comments} />
        {error ? <AppNotice tone="error">{error}</AppNotice> : null}
        <form className="mt-auto flex flex-col gap-2" onSubmit={send}>
          <MugField
            label="コメント"
            name="comment"
            maxLength={100}
            hint={idToken ? 'ニックネームで残ります' : 'ログインすると書けます'}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <MugButton type="submit" disabled={busy}>
            {idToken ? (busy ? '送信中' : 'コメントする') : 'ログインしてコメントする'}
          </MugButton>
        </form>
      </div>
    </main>
  );
}
