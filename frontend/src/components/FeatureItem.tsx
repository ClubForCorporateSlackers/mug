import type { ComponentType } from 'react';

type Props = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
};

// はじめの画面に並べる、アプリでできることの1行
export function FeatureItem({ icon: Icon, label }: Props) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left text-sm font-bold">
      <Icon className="size-6 shrink-0 text-primary" aria-hidden />
      {label}
    </li>
  );
}
