// デモ用のダミーデータを、本物のAPIを呼んで入れる（scripts/seed/README.md）。
// 位置のぼかし・市町村の判定・ランキングの加算は、本物と同じくサーバーが行う。DB に直接は書かない。
//
//   npm run seed            … 何を入れるかを表示するだけ
//   npm run seed -- --yes   … 実際に入れる
//   npm run seed -- --yes --append … 前に入れたデータがあっても、さらに足す

import { callApi } from './lib/api.ts';
import { loadStack, pacer } from './lib/aws.ts';
import { ensureUserAndLogin } from './lib/cognito.ts';
import { rand, randomPointIn } from './lib/geo.ts';
import { readState, STATE_PATH, writeState } from './lib/state.ts';
import { config, type SeedUser } from './seed.config.ts';

const args = new Set(process.argv.slice(2));
const REACTION_TYPES = ['odaiji', 'kaite', 'wakaru'] as const;

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = ([min, max]: [number, number]) => min + Math.floor(rand() * (max - min + 1));
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickWeighted(users: SeedUser[]): SeedUser {
  const total = users.reduce((s, u) => s + u.pinWeight, 0);
  let r = rand() * total;
  for (const u of users) if ((r -= u.pinWeight) < 0) return u;
  return users[users.length - 1];
}
function randomStamp(): 'kayui' | 'itai' | null {
  const r = rand();
  if (r < config.stampRatio.kayui) return 'kayui';
  if (r < config.stampRatio.kayui + config.stampRatio.itai) return 'itai';
  return null;
}

async function main() {
  const users = config.users;
  const totalPins = config.places.reduce((s, p) => s + p.pins, 0);
  const commentPins = Math.round(totalPins * config.commentPinRatio);
  const reactionPins = Math.round(totalPins * config.reactionPinRatio);
  console.log(`入れるもの：ユーザー ${users.length}人、ピン ${totalPins}件（${config.places.length}か所）`);
  console.log(`  コメントを付けるピン 約${commentPins}件、リアクションを付けるピン 約${reactionPins}件`);
  console.log(`  API：${config.apiBase}　書き込みの間隔：${config.writeIntervalMs}ms`);

  const state = readState();
  if (state.pins.length > 0 && !args.has('--append')) {
    console.error(`\n前に入れたデータの記録（${state.pins.length}件）があります：${STATE_PATH}`);
    console.error('先に片付ける（npm run cleanup）か、足す場合は --append を付けてください。');
    process.exitCode = 1;
    return;
  }
  if (!args.has('--yes')) {
    console.log('\n確認だけしました。実際に入れるときは `npm run seed -- --yes` を実行してください。');
    return;
  }

  const stack = await loadStack();
  const pace = pacer(config.writeIntervalMs);
  const started = Date.now();

  // 1. ユーザーを用意してログインし、プロフィールを登録する
  const sessions = new Map<string, { user: SeedUser; idToken: string }>();
  for (const user of users) {
    const { idToken, created } = await ensureUserAndLogin(stack.userPoolId, stack.clientId, user.email);
    await pace();
    await callApi('PUT', '/api/me', idToken, { nickname: user.nickname, bloodType: user.bloodType });
    sessions.set(user.email, { user, idToken });
    console.log(`ユーザー ${user.email}（${user.nickname}）：${created ? '作成' : 'すでにある'}、プロフィール登録済み`);
  }

  // 2. ピンを立てる（場所を混ぜた順に。時刻が場所ごとに固まらないように）
  const plan = shuffle(config.places.flatMap((p) => Array.from({ length: p.pins }, () => p)));
  const created: { pinId: string; ownerEmail: string }[] = [];
  for (const [i, place] of plan.entries()) {
    const owner = pickWeighted(users);
    const point = randomPointIn(place); // 送る前の座標はログに出さない
    const memo = rand() < config.memoEmptyRatio ? '' : pick(config.memos);
    await pace();
    const pin = await callApi<{ pinId: string; city: string }>('POST', '/api/pins', sessions.get(owner.email)!.idToken, {
      ...point,
      stamp: randomStamp(),
      memo,
    });
    created.push({ pinId: pin.pinId, ownerEmail: owner.email });
    state.pins.push({ pinId: pin.pinId, ownerEmail: owner.email });
    writeState(state); // 途中で止まっても片付けられるよう、1件ごとに記録する
    console.log(`ピン ${i + 1}/${plan.length}：${place.name} → ${pin.city}`);
  }

  // 3. ほかのユーザーからのコメント
  let commentCount = 0;
  for (const pin of shuffle(created).slice(0, commentPins)) {
    const others = users.filter((u) => u.email !== pin.ownerEmail);
    for (const text of shuffle(config.comments).slice(0, between(config.commentsPerPin))) {
      await pace();
      await callApi('POST', `/api/pins/${pin.pinId}/comments`, sessions.get(pick(others).email)!.idToken, { text });
      commentCount++;
    }
  }
  console.log(`コメント：${commentCount}件`);

  // 4. ほかのユーザーからのリアクション（同じ人・同じ種類は1回まで）
  let reactionCount = 0;
  for (const pin of shuffle(created).slice(0, reactionPins)) {
    const others = users.filter((u) => u.email !== pin.ownerEmail);
    const pairs = shuffle(others.flatMap((u) => REACTION_TYPES.map((t) => ({ u, t })))).slice(0, between(config.reactionsPerPin));
    for (const { u, t } of pairs) {
      await pace();
      await callApi('PUT', `/api/pins/${pin.pinId}/reactions/${t}`, sessions.get(u.email)!.idToken); // 本文なし（api-spec.md）
      reactionCount++;
    }
  }
  console.log(`リアクション：${reactionCount}件`);

  const sec = Math.round((Date.now() - started) / 1000);
  console.log(`\n終わりました（${Math.floor(sec / 60)}分${sec % 60}秒）。記録：${STATE_PATH}`);
}

main().catch((e: unknown) => {
  // エラーの名前とメッセージだけを出す（SDK のエラーに含まれる詳細やトークンを出さないため）
  const err = e as { name?: string; message?: string };
  console.error(`止まりました：${err.name ?? 'Error'}：${err.message ?? String(e)}`);
  console.error('ここまでに入れたピンは記録に残っています。片付ける場合は npm run cleanup（--append で足すと、最初から全件をもう一度入れます）。');
  process.exitCode = 1;
});
