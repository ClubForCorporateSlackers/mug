import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { AppNotice } from '@/components/AppNotice';
import { BottomSheet } from '@/components/BottomSheet';
import { CommentBox } from '@/components/CommentBox';
import { CommentList } from '@/components/CommentList';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';
import { ReactionBar } from '@/components/ReactionBar';
import { ReactionPicker } from '@/components/ReactionPicker';
import { formatAgo, stampLabel } from '@/lib/labels';
import type { Comment, Pin, ReactionType } from '@/lib/types';

type Props = {
  pin: Pin;
  idToken?: string;
  onClose: () => void;
  onNeedLogin: () => void;
};

type ReactionResponse = { reactions: Pin['reactions']; myReactions: ReactionType[] };

export function PinSheet({ pin, idToken, onClose, onNeedLogin }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [counts, setCounts] = useState(pin.reactions ?? {});
  const [mine, setMine] = useState<ReactionType[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

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
    setPicking(false);
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
      else setError(err instanceof Error ? err.message : 'リアクションを送れませんでした');
    }
  }

  async function send() {
    if (!idToken) {
      onNeedLogin();
      return;
    }
    if (!text.trim()) return;
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
    <>
      <BottomSheet label="ピンの詳細" onClose={onClose}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary">
            <MugMark className="size-9" decorative />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">匿名さんのピン</h2>
            <p className="text-sm text-muted-foreground">
              {pin.city || '場所不明'}の近く・{formatAgo(pin.createdAt)}
            </p>
          </div>
        </div>
        {pin.stamp ? (
          <p className="mt-3 self-start rounded-full bg-secondary px-3 py-1 text-sm font-bold">
            {stampLabel(pin.stamp)}
          </p>
        ) : null}
        {pin.memo ? <p className="mt-3 whitespace-pre-wrap">{pin.memo}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">位置は半径100m以内でずらしてあります</p>
        <div className="mt-3">
          <ReactionBar
            counts={counts}
            mine={mine}
            onToggle={(type) => void toggle(type)}
            onAdd={() => (idToken ? setPicking(true) : onNeedLogin())}
          />
        </div>
        <hr className="my-4" />
        <h3 className="mb-3 font-bold">コメント {comments.length}件</h3>
        <CommentList comments={comments} />
        {error ? (
          <div className="mt-3">
            <AppNotice tone="error">{error}</AppNotice>
          </div>
        ) : null}
        <div className="mt-4">
          {idToken ? (
            <CommentBox
              value={text}
              placeholder="ニックネームでコメント…"
              busy={busy}
              onChange={setText}
              onSubmit={() => void send()}
            />
          ) : (
            <MugButton variant="secondary" onClick={onNeedLogin}>
              ログインしてコメントする
            </MugButton>
          )}
        </div>
      </BottomSheet>
      {picking ? (
        <ReactionPicker mine={mine} onPick={(type) => void toggle(type)} onClose={() => setPicking(false)} />
      ) : null}
    </>
  );
}
