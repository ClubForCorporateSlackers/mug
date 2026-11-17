// 場所の一覧と、地図で確かめるためのリンクを出す（ネットにはつながない）。
//
//   npm run places

import { config, radiusOf } from './seed.config.ts';

const osm = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

let total = 0;
for (const p of config.places) {
  total += p.pins;
  if (p.kind === 'area') {
    console.log(`${String(p.pins).padStart(3)}件  ${p.name}（約${p.areaHa}ha → 半径${radiusOf(p)}m）\n       ${osm(p.lat, p.lng)}`);
  } else {
    console.log(`${String(p.pins).padStart(3)}件  ${p.name}（線に沿って左右${p.widthM}m）`);
    console.log(`       始点 ${osm(...p.from)}\n       終点 ${osm(...p.to)}`);
  }
}
console.log(`\n合計 ${total}件`);
