import { ChartColumn, Map, MapPin } from 'lucide-react';
import { FeatureItem } from '@/components/FeatureItem';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';

type Props = { onStart: () => void; onLogin: () => void };

export function SplashPage({ onStart, onLogin }: Props) {
  return (
    <main className="flex min-h-svh flex-col px-4 pt-16 pb-safe-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <MugMark className="h-32 w-24" />
        <h1 className="mt-2 text-3xl font-bold">むふ</h1>
        <p className="text-sm font-medium">
          「ここで刺された」をみんなで共有して、
          <br />
          蚊の多い場所を先回り。
        </p>
      </div>
      <ul className="mt-8 flex flex-col gap-3">
        <FeatureItem icon={MapPin} label="ワンタップで刺された場所にピン" />
        <FeatureItem icon={Map} label="蚊の多い場所が地図でわかる" />
        <FeatureItem icon={ChartColumn} label="地域・血液型別のランキング" />
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-10">
        <MugButton className="h-14" onClick={onStart}>
          はじめる（新規登録）
        </MugButton>
        <MugButton variant="ghost" onClick={onLogin}>
          ログイン
        </MugButton>
      </div>
    </main>
  );
}
