// デモ用のダミーデータを、本物のAPIを呼んで入れる（scripts/seed/README.md）。
// 位置のぼかし・市町村の判定・ランキングの加算は、本物と同じくサーバーが行う。DB に直接は書かない。
//
//   npm run seed            … 何を入れるかを表示するだけ
//   npm run seed -- --yes   … 実際に入れる
//   npm run seed -- --yes --append … 前に入れたデータがあっても、さらに足す

import { callApi } from './lib/api.ts';
import { loadStack, pacer } from './lib/aws.ts';
import { ensureUserAndLogin } from './lib/cognito.ts';
import { nowJst, rand, randomPointIn } from './lib/geo.ts';
import { readState, STATE_PATH, writeState } from './lib/state.ts';
import { compare, type Kind, snapshot } from './lib/verify.ts';
import { config, type Place, type SeedUser } from './seed.config.ts';

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
// ピンを立てる人：ふだんはその地域に住んでいる人から、travelerRatio の割合でほかの地域の人（旅行・出張）から選ぶ
function pickOwner(place: Place): SeedUser {
  const locals = config.users.filter((u) => u.home === place.region);
  const others = config.users.filter((u) => u.home !== place.region);
  if (locals.length === 0) return pickWeighted(config.users);
  if (others.length > 0 && rand() < config.travelerRatio) return pickWeighted(others);
  return pickWeighted(locals);
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

  // どこに・誰がピンを立てるかを先に決める（場所を混ぜた順に。時刻が場所ごとに固まらないように）
  const plan = shuffle(config.places.flatMap((p) => Array.from({ length: p.pins }, () => p))).map((place) => ({
    place,
    owner: pickOwner(place),
  }));
  console.log('  1人あたりのピン（今回の割り当て。実行のたびに変わる）：');
  for (const u of users) {
    const mine = plan.filter((x) => x.owner === u);
    const away = mine.filter((x) => x.place.region !== u.home).length;
    console.log(`    ${u.nickname}（${u.bloodType}型・${u.home}）：${mine.length}件${away ? `（うち地域の外 ${away}件）` : ''}`);
  }

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

  // 2. ピンを立てる（上で決めた順・人で）。前後でランキングを読み、件数の増え方が合うかを確かめる
  const month = nowJst(new Date()).slice(0, 7);
  const before = await snapshot(month);
  const expected: Record<Kind, Map<string, number>> = { user: new Map(), city: new Map(), blood: new Map() };
  const add = (kind: Kind, label: string) => expected[kind].set(label, (expected[kind].get(label) ?? 0) + 1);

  const created: { pinId: string; ownerEmail: string }[] = [];
  for (const [i, { place, owner }] of plan.entries()) {
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
    // サーバーがランキングに足すはずのもの（pin-api.ts と同じ。市町村の「不明」は数えない）
    add('user', owner.nickname);
    add('blood', `${owner.bloodType}型`);
    if (pin.city !== '不明') add('city', pin.city);
  }

  const warnings: string[] = [];
  if (nowJst(new Date()).slice(0, 7) !== month) {
    warnings.push('投入中に月が変わったので、ランキングの件数は確かめられませんでした');
  } else {
    const { mismatches, unchecked } = compare(before, await snapshot(month), expected);
    if (mismatches.length > 0) {
      warnings.push('ランキングの件数が、入れたピンと合いません（件数の加算に失敗したか、投入中に本物の投稿があった可能性）：');
      warnings.push(...mismatches.map((m) => `  ${m}`));
      warnings.push('  → このまま片付けると、本物の利用者の件数まで減らすことがあります。デモの前なら「片付けてから入れ直す」をおすすめします');
    } else {
      console.log('ランキングの件数：入れたピンと合っています');
    }
    if (unchecked.length > 0) console.log(`  （上位20件に入らず確かめられなかったもの：${unchecked.join('、')}）`);
  }
  for (const w of warnings) console.warn(`警告：${w}`);

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
  if (warnings.length > 0) {
    console.warn('\n※ 警告があります（もう一度表示します）');
    for (const w of warnings) console.warn(`警告：${w}`);
    process.exitCode = 2; // 入れることはできたが、確かめた結果が合わなかった
  }
}

main().catch((e: unknown) => {
  // エラーの名前とメッセージだけを出す（SDK のエラーに含まれる詳細やトークンを出さないため）
  const err = e as { name?: string; message?: string };
  console.error(`止まりました：${err.name ?? 'Error'}：${err.message ?? String(e)}`);
  console.error('ここまでに入れたピンは記録に残っています。片付ける場合は npm run cleanup（--append で足すと、最初から全件をもう一度入れます）。');
  process.exitCode = 1;
});
