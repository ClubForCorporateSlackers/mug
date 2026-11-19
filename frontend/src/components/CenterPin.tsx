import { MugMark } from '@/components/MugMark';

// 地図の真ん中に固定する蚊のピン。口の先（下の端）が地図の真ん中を指す。
// 地図を動かして刺された場所に合わせ、「ここで刺された！」でその場所にピンを立てる。危険度もこの場所で調べる。
// 開いた直後は真ん中が現在地なので、ピンの先が現在地の青い丸を指す
export function CenterPin() {
  return <MugMark className="h-16 w-12 drop-shadow-lg" decorative />;
}
