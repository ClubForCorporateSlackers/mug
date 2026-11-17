import { useState } from 'react';
import { ApiCheckCard } from '@/components/ApiCheckCard';
import { api } from '@/lib/api';

// 仮の画面：画面 → Worker → Lambda がつながっているかを確かめる（GET /api/hello）。
// 地図やログインの画面を作ったら置き換える。
export function HomePage() {
  const [result, setResult] = useState('まだ確認していません');

  async function checkApi() {
    try {
      const data = await api<{ message: string }>('GET', '/api/hello');
      setResult(`つながりました：${data.message}`);
    } catch (e) {
      setResult(`失敗しました：${e instanceof Error ? e.message : '不明なエラー'}`);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <ApiCheckCard result={result} onCheck={checkApi} />
    </main>
  );
}
