import { ApiError, nowJst } from './http';
import type { RankingKind, RankingsRepo } from './pins';

// GET /api/rankings（docs/api-spec.md の 9）。

const KINDS: readonly RankingKind[] = ['user', 'city', 'blood'];
export const TOP_N = 20;
// 1回の Query で読む件数の上限。件数の多い順は DynamoDB では並べられないので、読んでから Lambda で並べる。
// 1件は約100バイトなので、1000件でも約100KB（約13ユニット）。ハッカソンの人数なら全部読める
export const READ_LIMIT = 1000;
// 血液型「答えない」はランキングに出さない（件数は数えている。docs/adr/feature-api-social.md）
const HIDDEN_KEYS: Partial<Record<RankingKind, string[]>> = { blood: ['UNKNOWN'] };

export type RankingDeps = { rankings: RankingsRepo; now?: () => Date };

export function validateRankingQuery(
  query: Record<string, string | undefined> | undefined,
  now: Date,
): { type: RankingKind; month: string } {
  const q = query ?? {};
  if (!(KINDS as readonly (string | undefined)[]).includes(q.type)) {
    throw new ApiError('VALIDATION_ERROR', `type は ${KINDS.join(' / ')} のどれかを指定してください`);
  }
  // 省略したら日本時間の今月
  const month = q.month ?? nowJst(now).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new ApiError('VALIDATION_ERROR', 'month は YYYY-MM の形（例：2026-11）で指定してください');
  }
  return { type: q.type as RankingKind, month };
}

export async function getRanking(query: Record<string, string | undefined> | undefined, deps: RankingDeps) {
  const { type, month } = validateRankingQuery(query, deps.now?.() ?? new Date());
  const hidden = HIDDEN_KEYS[type] ?? [];
  const entries = (await deps.rankings.list(month, type, READ_LIMIT))
    .filter((e) => e.count > 0 && !hidden.includes(e.key))
    // 件数の多い順。同じ件数なら key の順（毎回同じ並びにするため）
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, TOP_N);

  // 同じ件数は同じ順位。次の順位は人数ぶん飛ばす（例：1, 2, 2, 4）
  const items = entries.map((e, i) => ({ rank: 0, label: e.label, count: e.count, index: i }));
  for (const item of items) {
    item.rank = item.index > 0 && item.count === items[item.index - 1].count ? items[item.index - 1].rank : item.index + 1;
  }
  return { type, month, items: items.map(({ rank, label, count }) => ({ rank, label, count })) };
}
