import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 投入したピンの記録（片付けに使う）。パスワード・トークン・送る前の座標は入れない。コミットしない（.gitignore）
export const STATE_PATH = fileURLToPath(new URL('../.seed-state.json', import.meta.url));

export type SeedState = {
  pins: { pinId: string; ownerEmail: string }[]; // pinId は APIの形（cell-ULID）
};

export function readState(): SeedState {
  if (!existsSync(STATE_PATH)) return { pins: [] };
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as SeedState;
}

export function writeState(s: SeedState) {
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

// 片付けが終わったら、名前を変えて残す（もう一度片付けに使われないように）
export function archiveState() {
  if (existsSync(STATE_PATH)) renameSync(STATE_PATH, STATE_PATH.replace(/\.json$/, `.done-${Date.now()}.json`));
}
