import { call, event, GOOD_TOKEN, setup, SUB } from './fakes';
import type { UserItem } from '../lambda/api/users';

// PATCH /api/pins/{pinId}・DELETE /api/pins/{pinId} のテスト（偽物の DB・地理院API を使う）。
// 決めたことは docs/adr/feature-api-pins-edit.md。

const KOMATSU: UserItem = { userId: SUB, nickname: 'こまつ', bloodType: 'A', createdAt: 'x', updatedAt: 'x', pinCount: 3 };
const ORIGINAL = { lat: 35.68123, lng: 139.76712 };

describe('POST /api/pins で血液型を保存する', () => {
  test('立てたときの血液型をピンに保存し、地図の API では返さない', async () => {
    const { handler, pinStore } = setup({ users: [KOMATSU] });
    await call(handler, event('POST', '/api/pins', { token: GOOD_TOKEN, body: ORIGINAL }));
    expect(pinStore[0].bloodType).toBe('A');

    const p = pinStore[0];
    const list = await call(
      handler,
      event('GET', '/api/pins', {
        query: { minLat: String(p.lat - 0.01), maxLat: String(p.lat + 0.01), minLng: String(p.lng - 0.01), maxLng: String(p.lng + 0.01) },
      }),
    );
    expect(list.body.pins).toHaveLength(1);
    expect(list.body.pins[0]).not.toHaveProperty('bloodType');
    expect(JSON.stringify(list.body)).not.toContain('"A"');
  });
});
