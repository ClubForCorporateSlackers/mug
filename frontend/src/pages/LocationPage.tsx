import { useState } from 'react';
import { Crosshair, EyeOff, Shield } from 'lucide-react';
import { InfoRow } from '@/components/InfoRow';
import { MascotCircle } from '@/components/MascotCircle';
import { MugButton } from '@/components/MugButton';
import { Screen } from '@/components/Screen';
import { currentPosition } from '@/lib/location';

type Props = { onDone: () => void };

// A8 位置情報の許可（初回）
export function LocationPage({ onDone }: Props) {
  const [busy, setBusy] = useState(false);

  async function allow() {
    setBusy(true);
    // 許可されてもされなくても地図へ進む（拒否されたら地図で B3 の帯を出す）
    await currentPosition().catch(() => undefined);
    setBusy(false);
    onDone();
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center gap-6 px-4 pt-12">
        <MascotCircle size="lg" dashed />
        <h1 className="text-[22px] leading-7 font-bold">位置情報をオンにしてください</h1>
        <ul className="flex w-full flex-col gap-3">
          <InfoRow icon={Crosshair}>地図をいまいる場所に合わせ、刺された場所にすぐピンを立てるために使います。</InfoRow>
          <InfoRow icon={Shield}>公開されるピンの位置は、半径100m以内でランダムにずらします。</InfoRow>
          <InfoRow icon={EyeOff}>あなたの位置がほかの人にそのまま知られることはありません。</InfoRow>
        </ul>
      </div>
      <div className="flex flex-col gap-2 px-4 py-2">
        <p className="text-center text-xs font-medium text-muted-foreground">
          ボタンを押すと、ブラウザの許可ダイアログが表示されます。
        </p>
        <MugButton disabled={busy} onClick={() => void allow()}>
          位置情報を許可する
        </MugButton>
        <MugButton tone="plain" onClick={onDone}>
          あとで
        </MugButton>
      </div>
    </Screen>
  );
}
