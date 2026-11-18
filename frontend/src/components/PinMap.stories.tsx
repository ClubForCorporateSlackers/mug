import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PinMap } from './PinMap';

// 地図の画像は OpenFreeMap から読み込む（ネットにつながっている必要がある）
const meta = {
  title: 'Components/PinMap',
  component: PinMap,
  args: {
    selectedPinId: null,
    onBoundsChange: fn(),
    onSelectPin: fn(),
    onUserMove: fn(),
    pins: [
      {
        pinId: 'xn76-01JDSAMPLE1',
        lat: 35.6815,
        lng: 139.7668,
        city: '東京都千代田区',
        stamp: 'kayui',
        memo: '公園のベンチ',
        createdAt: '2026-11-16T10:30:00+09:00',
        commentCount: 2,
        reactions: { odaiji: 3 },
      },
      {
        pinId: 'xn76-01JDSAMPLE2',
        lat: 35.0116,
        lng: 135.7681,
        city: '京都府京都市中京区',
        stamp: 'itai',
        memo: '',
        createdAt: '2026-11-15T18:00:00+09:00',
        commentCount: 0,
        reactions: {},
      },
    ],
  },
  decorators: [
    (Story) => (
      <div className="h-[480px] w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PinMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selectedPinId: 'xn76-01JDSAMPLE1' } };
export const NoPins: Story = { args: { pins: [] } };
