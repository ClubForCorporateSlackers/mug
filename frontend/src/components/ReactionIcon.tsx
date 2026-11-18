import { Hand, Heart, ThumbsUp } from 'lucide-react';
import type { ReactionType } from '@/lib/types';

type Props = { type: ReactionType; className?: string };

const ICONS = { odaiji: Heart, kaite: Hand, wakaru: ThumbsUp } as const;

// リアクション（お大事に・掻いてあげる・わかる）のアイコン
export function ReactionIcon({ type, className }: Props) {
  const Icon = ICONS[type];
  return <Icon className={className} aria-hidden />;
}
