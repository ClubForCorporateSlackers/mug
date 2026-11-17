import { callApi } from './api.ts';

// 投入の前後で GET /api/rankings を読み、件数の増え方が入れたピンと合うかを確かめる。
// Lambda はピンを保存したあとの件数の加算に失敗しても 201 を返すので（infra/lambda/api/pin-api.ts）、
// そのずれに気づくため。ずれたまま片付けると、本物の利用者の件数まで減らしてしまう。
//
// 限界：API は上位20件しか返さないので、上位に入らない行は確かめられない（「確かめられない」と表示する）。
// 投入中に本物の利用者が投稿すると、その分も増えるので、ずれとして表示されることがある。

export type Kind = 'user' | 'city' | 'blood';
export type Snapshot = Record<Kind, { complete: boolean; counts: Map<string, number> }>;

const KINDS: Kind[] = ['user', 'city', 'blood'];
const KIND_LABEL: Record<Kind, string> = { user: '人', city: '市町村', blood: '血液型' };
const TOP = 20;

export async function snapshot(month: string): Promise<Snapshot> {
  const s = {} as Snapshot;
  for (const kind of KINDS) {
    const r = await callApi<{ items: { label: string; count: number }[] }>('GET', `/api/rankings?type=${kind}&month=${month}`);
    const counts = new Map<string, number>();
    for (const it of r.items) counts.set(it.label, (counts.get(it.label) ?? 0) + it.count);
    // 20件より少なければ、それで全部（載っていない行は 0 件）
    s[kind] = { complete: r.items.length < TOP, counts };
  }
  return s;
}

// expected：種類ごとに「label → 増えるはずの件数」
// 戻り値：ずれの一覧（空なら合っている）
export function compare(before: Snapshot, after: Snapshot, expected: Record<Kind, Map<string, number>>) {
  const mismatches: string[] = [];
  const unchecked: string[] = [];
  for (const kind of KINDS) {
    for (const [label, want] of expected[kind]) {
      const a = after[kind].counts.get(label) ?? (after[kind].complete ? 0 : undefined);
      const b = before[kind].counts.get(label) ?? (before[kind].complete ? 0 : undefined);
      if (a === undefined || b === undefined) {
        unchecked.push(`${KIND_LABEL[kind]}「${label}」`);
        continue;
      }
      if (a - b !== want) mismatches.push(`${KIND_LABEL[kind]}「${label}」：${want}件増えるはずが ${a - b}件`);
    }
  }
  return { mismatches, unchecked };
}
