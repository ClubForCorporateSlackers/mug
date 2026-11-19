import { Plus } from 'lucide-react';

// 地図の真ん中のしるし。危険度はこの場所で調べる。
export function CenterMark() {
  return <Plus className="size-6 text-foreground/50" strokeWidth={1.5} aria-hidden />;
}
