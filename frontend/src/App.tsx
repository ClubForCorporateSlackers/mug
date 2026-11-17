import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

// 仮の画面：画面 → Worker → Lambda がつながっているかを確かめる（GET /api/hello）。
// 地図やログインの画面を作ったら置き換える。
function App() {
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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>mug</CardTitle>
          <CardDescription>ここで蚊に刺された、を地図で共有する</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={checkApi}>APIの疎通を確認</Button>
          <p className="text-sm text-muted-foreground">{result}</p>
        </CardContent>
      </Card>
    </main>
  );
}

export default App;
