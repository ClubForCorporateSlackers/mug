import { useState } from 'react';
import { AppHeader, type AppView } from '@/components/AppHeader';
import { MapPage } from '@/pages/MapPage';
import { RankingPage } from '@/pages/RankingPage';

// 画面の切り替え。ルーターを入れるまでは、ヘッダーのボタンで地図とランキングを切り替える
function App() {
  const [view, setView] = useState<AppView>('map');

  return (
    <div className="flex h-svh flex-col">
      <AppHeader current={view} onChange={setView} />
      {view === 'map' ? <MapPage /> : <RankingPage />}
    </div>
  );
}

export default App;
