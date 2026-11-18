import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';

type Props = { onStart: () => void; onLogin: () => void };

export function SplashPage({ onStart, onLogin }: Props) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <MugMark className="size-40" />
      <div>
        <p className="text-3xl font-bold">mug</p>
        <p className="mt-1 font-medium">ここで刺された、を地図で共有する</p>
      </div>
      <div className="mt-4 flex w-full flex-col gap-2">
        <MugButton onClick={onStart}>近くの地図を見る</MugButton>
        <MugButton variant="ghost" onClick={onLogin}>
          ログイン
        </MugButton>
      </div>
    </main>
  );
}
