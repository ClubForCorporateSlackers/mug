import { UserRound } from 'lucide-react';
import { formatAgo } from '@/lib/labels';
import type { Comment } from '@/lib/types';

type Props = { comments: Comment[] };

export function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">まだコメントはありません</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.commentId} className="flex gap-3 text-sm">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted" aria-hidden>
            <UserRound className="size-4" />
          </span>
          <div>
            <p className="font-bold">
              {comment.nickname}{' '}
              <span className="text-xs font-medium text-muted-foreground">{formatAgo(comment.createdAt)}</span>
            </p>
            <p className="whitespace-pre-wrap">{comment.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
