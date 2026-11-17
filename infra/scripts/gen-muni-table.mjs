// 国土地理院の muni.js から、市町村コード → 「都道府県＋市区町村」の変換表（lambda/api/muni-table.ts）を作る。
// 使い方（infra/ で）：
//   curl -o <保存先>/muni.js https://maps.gsi.go.jp/js/muni.js
//   node scripts/gen-muni-table.mjs <保存先>/muni.js
// muni.js のキーは先頭の0がない（例 "1102"）が、逆ジオコーディングAPIは "01102" を返すので、5桁にそろえる。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) {
  console.error('muni.js のパスを指定してください');
  process.exit(1);
}

const line = /^GSI\.MUNI_ARRAY\["(\d+)"\] = '(\d+),([^,']+),(\d+),([^,']+)';\s*$/;
const entries = [];
for (const raw of readFileSync(src, 'utf8').split(/\r?\n/)) {
  const m = line.exec(raw);
  if (!m) continue;
  const code = m[1].padStart(5, '0');
  // 「札幌市　中央区」の全角空白を取り除き、「北海道札幌市中央区」にする
  const name = `${m[3]}${m[5].replace(/[\s　]+/g, '')}`;
  entries.push([code, name]);
}
if (entries.length < 1500) {
  console.error(`件数が少なすぎます（${entries.length}件）。muni.js の形が変わったかもしれません`);
  process.exit(1);
}

const body = entries.map(([c, n]) => `  '${c}': '${n}',`).join('\n');
const out = `// このファイルは scripts/gen-muni-table.mjs で自動生成したもの。手で直さない。
// 出典：国土地理院「地理院地図」の muni.js（https://maps.gsi.go.jp/js/muni.js）を加工して作成
// 市町村コード（5桁）→ 都道府県＋市区町村。${entries.length}件
export const MUNI_TABLE: Readonly<Record<string, string>> = {
${body}
};
`;
const dest = fileURLToPath(new URL('../lambda/api/muni-table.ts', import.meta.url));
writeFileSync(dest, out);
console.log(`${entries.length}件を書き出しました：${dest}`);
