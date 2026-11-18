import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RiskLevel = 'high' | 'mid' | 'low';

type Props = {
  title: string;
  subtitle: string;
  // 危険度。null は「まだ分からない」（API 追加待ち）
  risk?: RiskLevel | null;
};

const RISK_LABEL: Record<RiskLevel, string> = { high: '高', mid: '中', low: '低' };
const RISK_DOT: Record<RiskLevel, string> = { high: 'bg-risk-high', mid: 'bg-risk-mid', low: 'bg-risk-low' };

// 地図の上の白いカード。いまのエリア名・件数・危険度
export function AreaCard({ title, subtitle, risk }: Props) {
  return (
    <div className="flex h-14 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-card pr-2 pl-4 shadow-floating">
      <MapPin className="size-6 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[17px] leading-6 font-bold tracking-[0.01em]">{title}</p>
        <p className="truncate text-xs leading-4 font-medium tracking-[0.01em] text-muted-foreground">{subtitle}</p>
      </div>
      {risk !== undefined ? (
        <p className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent py-2 pr-3 pl-2.5 text-[13px] leading-[18px] font-bold">
          <span className={cn('size-2 rounded-full', risk ? RISK_DOT[risk] : 'bg-placeholder')} aria-hidden />
          危険度 {risk ? RISK_LABEL[risk] : '—'}
        </p>
      ) : null}
    </div>
  );
}
