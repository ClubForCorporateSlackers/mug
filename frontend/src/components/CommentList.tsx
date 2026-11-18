import { UserRound } from 'lucide-react';
import type { Comment } from '@/lib/types';

type Props = { comments: (Comment & { when: string })[]; loading?: boolean };

// B7 のコメント。ニックネーム・時間・本文。古い順
export function CommentList({ comments, loading = false }: Props) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4" aria-label="コメント">
      <h3 className="text-[17px] leading-6 font-bold">コメント {comments.length}件</h3>
      {loading ? <p className="text-[15px] text-muted-foreground">読み込み中…</p> : null}
      {!loading && comments.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">まだコメントはありません</p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {comments.map((comment) => (
          <li key={comment.commentId} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
              <UserRound className="size-5 text-muted-foreground" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="text-[15px] leading-[22px] font-bold">
                {comment.nickname} <span className="text-xs font-medium text-muted-foreground">{comment.when}</span>
              </p>
              <p className="text-[17px] leading-[26px] font-medium break-words whitespace-pre-wrap">{comment.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
