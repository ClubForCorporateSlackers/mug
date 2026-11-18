import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

type Props = {
  // 左の戻るボタンの文字（「戻る」「マップ」など）。なければ出さない
  backLabel?: string;
  onBack?: () => void;
  title?: string;
  // 右のボタン（「保存」など）
  trailing?: ReactNode;
  // 左を戻る矢印ではなく文字だけにする（「キャンセル」など）
  leading?: ReactNode;
};

// Figma の Nav Bar（高さ44）
export function NavBar({ backLabel, onBack, title, trailing, leading }: Props) {
  return (
    <header className="grid h-11 shrink-0 grid-cols-[110px_1fr_110px] items-center pr-4 pl-2">
      <div className="flex items-center">
        {leading ??
          (backLabel && onBack ? (
            <button
              type="button"
              className="flex h-11 items-center text-[17px] leading-[26px] font-medium text-primary"
              onClick={onBack}
            >
              <ChevronLeft className="size-6" aria-hidden />
              {backLabel}
            </button>
          ) : null)}
      </div>
      {/* 見出しがない画面では空の h1 を出さない（大きな見出しの h1 と二重にならないように） */}
      {title ? <h1 className="truncate text-center text-[17px] leading-6 font-bold">{title}</h1> : <span />}
      <div className="flex justify-end">{trailing}</div>
    </header>
  );
}
