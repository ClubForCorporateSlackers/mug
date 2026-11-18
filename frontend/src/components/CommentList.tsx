import { formatWhen } from '@/lib/labels';
import type { Comment } from '@/lib/types';

type Props = { comments: Comment[] };

export function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">まだコメントはありません</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {comments.map((comment) => (
        <li key={comment.commentId} className="rounded-2xl bg-muted px-3 py-2 text-sm">
          <p className="font-bold">
            {comment.nickname}{' '}
            <span className="font-medium text-muted-foreground">{formatWhen(comment.createdAt)}</span>
          </p>
          <p className="whitespace-pre-wrap">{comment.text}</p>
        </li>
      ))}
    </ul>
  );
}
