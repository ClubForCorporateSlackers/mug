import { Crosshair, EyeOff, Shield } from 'lucide-react';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';

const POINTS = [
  { icon: Crosshair, text: '地図をいまいる場所に合わせ、刺された場所にすぐピンを立てるために使います。' },
  { icon: Shield, text: '公開されるピンの位置は、半径100m以内でランダムにずらします。' },
  { icon: EyeOff, text: 'あなたの位置がほかの人にそのまま知られることはありません。' },
];

type Props = { busy: boolean; onAllow: () => void; onLater: () => void };

export function LocationPage({ busy, onAllow, onLater }: Props) {
  return (
    <main className="flex min-h-svh flex-col px-4 pt-10 pb-6">
      <div className="mx-auto grid size-40 place-items-center rounded-full border-2 border-dashed border-primary bg-secondary">
        <MugMark className="size-24" decorative />
      </div>
      <h1 className="mt-6 text-center text-xl font-bold">位置情報をオンにしてください</h1>
      <ul className="mt-5 flex flex-col gap-3">
        {POINTS.map((point) => (
          <li key={point.text} className="flex gap-3 rounded-2xl bg-card px-3 py-3 text-sm">
            <point.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
            {point.text}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <p className="text-center text-xs text-muted-foreground">
          ボタンを押すと、ブラウザの許可ダイアログが表示されます。
        </p>
        <MugButton onClick={onAllow} disabled={busy}>
          {busy ? '確認中' : '位置情報を許可する'}
        </MugButton>
        <MugButton variant="link" onClick={onLater}>
          あとで
        </MugButton>
      </div>
    </main>
  );
}
