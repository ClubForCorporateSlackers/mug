import { MugMark } from './MugMark';

type Props = { children: string };

// C5 の上の黄色いカード（蚊と吹き出し）
export function HeroCard({ children }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] bg-brand px-4 py-5">
      <MugMark label="" className="h-[78px] w-14 shrink-0" />
      <p className="text-[17px] leading-[26px] font-bold">{children}</p>
    </div>
  );
}
