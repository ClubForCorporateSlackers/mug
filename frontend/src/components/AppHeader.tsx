import { Map, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AppView = 'map' | 'ranking';

type Props = {
  current: AppView;
  onChange: (view: AppView) => void;
};

// 画面上部の見出しと、地図／ランキングの切り替え
export function AppHeader({ current, onChange }: Props) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-2">
      <h1 className="text-lg font-bold">mug</h1>
      <nav className="flex gap-1">
        <Button
          variant={current === 'map' ? 'default' : 'ghost'}
          size="sm"
          aria-current={current === 'map' ? 'page' : undefined}
          onClick={() => onChange('map')}
        >
          <Map />
          地図
        </Button>
        <Button
          variant={current === 'ranking' ? 'default' : 'ghost'}
          size="sm"
          aria-current={current === 'ranking' ? 'page' : undefined}
          onClick={() => onChange('ranking')}
        >
          <Trophy />
          ランキング
        </Button>
      </nav>
    </header>
  );
}
