import { Droplet } from 'lucide-react';
import { InitialAvatar } from './InitialAvatar';

type Props = { nickname: string; bloodLabel?: string; email: string };

// D1 の上のカード。ニックネーム・血液型・メールアドレス
export function ProfileCard({ nickname, bloodLabel, email }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] bg-card px-4 py-4">
      <InitialAvatar name={nickname} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-2 text-xl leading-7 font-bold">
          {nickname}
          {bloodLabel ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-primary">
              <Droplet className="size-3.5" aria-hidden />
              {bloodLabel}
            </span>
          ) : null}
        </p>
        <p className="truncate text-[13px] font-medium text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}
