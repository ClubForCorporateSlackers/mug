import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RankType } from '@/lib/types';

type Props = {
  value: RankType;
  options: { id: RankType; label: string }[];
  onChange: (value: RankType) => void;
  // 選んでいる種類の中身（タブの下に出る）
  children?: ReactNode;
};

// ランキングの「人／市町村／血液型」の切り替え。shadcn の Tabs なので、矢印キーでも動かせる
export function RankTypeTabs({ value, options, onChange, children }: Props) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as RankType)} className="gap-4">
      <TabsList className="grid h-auto w-full grid-cols-3 rounded-full bg-muted p-1 text-foreground group-data-[orientation=horizontal]/tabs:h-auto">
        {options.map((option) => (
          <TabsTrigger
            key={option.id}
            value={option.id}
            className="touch-target h-auto rounded-full border-0 py-2 text-sm font-bold text-foreground data-[state=active]:bg-card group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={value} className="flex flex-col gap-4">
        {children}
      </TabsContent>
    </Tabs>
  );
}
