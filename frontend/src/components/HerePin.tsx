import { HereDot } from '@/components/HereDot';
import { MugMark } from '@/components/MugMark';

// 現在地。蚊のピンの口の先に、Google マップと同じ青い点を付ける。下の端（青い点の中心）が地点。
export function HerePin() {
  return (
    <div className="relative h-16 w-12">
      <MugMark className="size-full drop-shadow-lg" decorative />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
        <HereDot />
      </div>
    </div>
  );
}
