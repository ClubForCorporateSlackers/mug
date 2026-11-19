// 現在地。Google マップと同じ青い点（白いふち＋うすい輪）。中心が地点。
export function HereDot() {
  return (
    <div className="relative grid size-12 place-items-center">
      <span className="absolute inset-0 rounded-full bg-here/20" />
      <span className="absolute inset-2 animate-ping rounded-full bg-here/30" />
      <span className="relative size-4 rounded-full border-2 border-card bg-here shadow-md" />
    </div>
  );
}
