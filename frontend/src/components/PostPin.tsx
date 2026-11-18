import { MugMark } from '@/components/MugMark';

// これから立てるピン。蚊の口の先に青い点を付けて、刺した場所をはっきり見せる。
// 下の端（青い点の中心）が地点。
export function PostPin() {
  return (
    <div className="relative h-16 w-12">
      <MugMark className="size-full drop-shadow-lg" decorative />
      <span className="absolute bottom-0 left-1/2 size-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-card bg-here shadow-md" />
    </div>
  );
}
