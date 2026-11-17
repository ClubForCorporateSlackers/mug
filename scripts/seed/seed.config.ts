// デモ用のダミーデータの設定。件数や場所を変えたいときは、このファイルだけを直す。
//
// 個人を特定できないようにするための決まり（必ず守る）
// - ニックネームは架空のもの。本名・メンバー・有名人・キャラクター・実在のSNSアカウントに似た名前は使わない
// - メールアドレスは example.com（実在しないドメイン）。Cognito からメールは送らない
// - メモ・コメントに人名・住所・電話番号・会社名・学校名・店名を書かない
// - 場所は大きな公園や河川敷などの公共の場所。住宅地や個人の建物を中心にしない

export type BloodType = 'A' | 'B' | 'O' | 'AB' | 'UNKNOWN';

export type SeedUser = {
  email: string; // 必ず seed- で始まり @example.com で終わる（片付けで探すため）
  nickname: string;
  bloodType: BloodType;
  pinWeight: number; // ピンを立てる割合の重み（ランキングに差が出るように）
};

// 刺されやすい場所。種類は2つ
// - area（公園など）：中心から radiusM の円の中に置く
// - line（河川敷）：from から to までの線に沿って、左右 widthM 以内に置く（川に沿って細長く散らすため）
export type Place =
  | { name: string; kind: 'area'; lat: number; lng: number; areaHa: number; radiusM?: number; pins: number }
  | { name: string; kind: 'line'; from: [number, number]; to: [number, number]; widthM: number; pins: number };

// ---- ばらまく範囲（半径）の決め方 ----
// 公園の面積（おおよその値、ha）から、同じ広さの円の半径を出し、その6割にする。
// サーバーがさらに最大100mずらすので、6割にしておくとほとんどのピンが公園の中かすぐそばに収まる。
// 小さすぎる・大きすぎると見栄えが悪いので、150m〜450m の間に収める。radiusM を書けばそちらを使う。
// 円の中では中心に寄せて置く（距離＝半径×乱数）。地図を開いたとき、公園の真ん中が密集して見えるようにするため。
export function radiusOf(p: Extract<Place, { kind: 'area' }>): number {
  if (p.radiusM) return p.radiusM;
  const equivalent = Math.sqrt((p.areaHa * 10_000) / Math.PI);
  return Math.round(Math.min(450, Math.max(150, equivalent * 0.6)) / 10) * 10;
}

export const config = {
  // 本物のAPI（Worker「mug」）。ここ以外にURLは書かない
  apiBase: 'https://mug.st2026ne.workers.dev',
  region: 'ap-northeast-1',
  stackName: 'MugStack',

  // 書き込みの間隔（ミリ秒）。DynamoDB のユニットに収めるため、1秒に1件
  writeIntervalMs: 1000,
  // 片付けの削除の間隔（ミリ秒）。1回の削除は1ユニットなので少し速め
  cleanupIntervalMs: 300,

  users: [
    { email: 'seed-01@example.com', nickname: 'かゆかゆ太郎', bloodType: 'A', pinWeight: 35 },
    { email: 'seed-02@example.com', nickname: '蚊よけ隊', bloodType: 'B', pinWeight: 25 },
    { email: 'seed-03@example.com', nickname: 'ぷっくり丸', bloodType: 'O', pinWeight: 20 },
    { email: 'seed-04@example.com', nickname: '虫よけスプレー係', bloodType: 'AB', pinWeight: 12 },
    { email: 'seed-05@example.com', nickname: 'よなよなブーン', bloodType: 'O', pinWeight: 8 },
  ] satisfies SeedUser[],

  // 座標はおおよその値。実行前に `npm run places` で地図を開いて確かめる（README）
  places: [
    // ---- 東京（密集して見せる）----
    { name: '代々木公園', kind: 'area', lat: 35.6717, lng: 139.6949, areaHa: 54, pins: 28 },
    { name: '井の頭恩賜公園', kind: 'area', lat: 35.6997, lng: 139.573, areaHa: 43, pins: 16 },
    { name: '葛西臨海公園', kind: 'area', lat: 35.6417, lng: 139.8616, areaHa: 80, pins: 13 },
    { name: '多摩川河川敷（二子玉川の上流側）', kind: 'line', from: [35.6085, 139.6255], to: [35.615, 139.612], widthM: 60, pins: 14 },
    { name: '荒川河川敷（千住新橋〜堀切橋）', kind: 'line', from: [35.7585, 139.8], to: [35.7505, 139.817], widthM: 80, pins: 11 },
    { name: '上野恩賜公園', kind: 'area', lat: 35.7148, lng: 139.7735, areaHa: 53, pins: 10 },
    { name: '国営昭和記念公園', kind: 'area', lat: 35.7055, lng: 139.3965, areaHa: 165, pins: 8 },

    // ---- ほかの地域 ----
    { name: '大阪城公園', kind: 'area', lat: 34.6873, lng: 135.5262, areaHa: 106, pins: 9 },
    { name: '鴨川河川敷（三条〜出町柳）', kind: 'line', from: [35.0095, 135.7718], to: [35.029, 135.7712], widthM: 25, pins: 6 },
    { name: '名城公園', kind: 'area', lat: 35.1905, lng: 136.903, areaHa: 30, pins: 5 },
    { name: '大濠公園', kind: 'area', lat: 33.586, lng: 130.3765, areaHa: 40, pins: 5 },
    { name: '八幡山公園（宇都宮）', kind: 'area', lat: 36.57, lng: 139.884, areaHa: 22, pins: 5 },
    { name: '中島公園（札幌）', kind: 'area', lat: 43.047, lng: 141.3545, areaHa: 21, pins: 5 },
    { name: '西公園（仙台）', kind: 'area', lat: 38.264, lng: 140.8625, areaHa: 10, pins: 5 },
    { name: '中央公園（広島）', kind: 'area', lat: 34.399, lng: 132.455, areaHa: 42, pins: 5 },
    { name: '奥武山公園（那覇）', kind: 'area', lat: 26.205, lng: 127.6745, areaHa: 30, pins: 5 },
  ] satisfies Place[] as Place[],

  // ピンを立てるときのスタンプの割合（合計1）
  stampRatio: { kayui: 0.5, itai: 0.3, none: 0.2 },
  // メモを空にする割合
  memoEmptyRatio: 0.3,
  memos: [
    'ベンチで休んでたら3か所',
    '草むらの近くは要注意',
    '夕方の散歩中にやられた',
    '虫よけを塗り忘れた日に限って…',
    '足首ばかり狙われる',
    '水辺のそばは多い気がする',
    'ジョギング中でも刺された',
    '日陰で涼んでいたら',
    '10分いただけで2か所',
    '腕がぷっくり',
    'まだ11月なのに油断した',
    'しゃがんだ瞬間にやられた',
    '風がない日は特に多い',
    '木の下はやめておいたほうがいい',
  ],

  // コメントを付けるピンの割合と、1つのピンに付ける数
  commentPinRatio: 0.2,
  commentsPerPin: [1, 3] as [number, number],
  comments: [
    'お大事に！',
    'この辺り多いですよね',
    '虫よけ必須ですね',
    'わかります、私も刺されました',
    'かゆいの早く治りますように',
    '冷やすと少し楽になりますよ',
    '同じ場所でやられました…',
    '夕方は特に多いですね',
    '掻きすぎないように！',
    '情報ありがとうございます',
    '長袖で行くことにします',
  ],

  // リアクション（odaiji・kaite・wakaru）を付けるピンの割合と、1つのピンに付ける数
  reactionPinRatio: 0.4,
  reactionsPerPin: [1, 3] as [number, number],
};
