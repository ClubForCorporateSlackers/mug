import { BarChart2, Map, MapPin } from 'lucide-react';
import { AppNotice } from '@/components/AppNotice';
import { InfoRow } from '@/components/InfoRow';
import { MugButton } from '@/components/MugButton';
import { MugMark } from '@/components/MugMark';
import { Screen } from '@/components/Screen';

type Props = {
  onStart: () => void;
  onLogin: () => void;
  // デモ用アカウントが設定されているときだけ渡す
  onDemo?: () => void;
  demoBusy?: boolean;
  demoError?: string;
};

// A1 ようこそ
export function WelcomePage({ onStart, onLogin, onDemo, demoBusy = false, demoError }: Props) {
  return (
    <Screen tone="brand">
      <div className="flex flex-1 flex-col items-center gap-4 px-4 pt-14 text-center">
        <MugMark className="h-[146px] w-[104px]" />
        <h1 className="text-[34px] leading-[41px] font-bold">むふ</h1>
        <p className="text-base leading-6 font-medium">
          「ここで刺された」をみんなで共有して、
          <br />
          蚊の多い場所を先回り。
        </p>
        <ul className="mt-4 flex w-full flex-col gap-3 text-left">
          <InfoRow icon={MapPin}>ワンタップで刺された場所にピン</InfoRow>
          <InfoRow icon={Map}>蚊の多い場所が地図でわかる</InfoRow>
          <InfoRow icon={BarChart2}>地域・血液型別のランキング</InfoRow>
        </ul>
      </div>
      <div className="flex flex-col gap-2 px-4 py-2">
        <MugButton onClick={onStart}>はじめる（新規登録）</MugButton>
        <MugButton tone="plain" onClick={onLogin}>
          ログイン
        </MugButton>
        {onDemo ? (
          <MugButton tone="plain" className="h-10 text-[15px] font-medium" disabled={demoBusy} onClick={onDemo}>
            {demoBusy ? 'デモの準備中…' : 'デモ用アカウントで入る'}
          </MugButton>
        ) : null}
        {demoError ? <AppNotice tone="error">{demoError}</AppNotice> : null}
      </div>
    </Screen>
  );
}
