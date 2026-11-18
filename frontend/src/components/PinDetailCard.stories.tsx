import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PinDetailCard } from './PinDetailCard';

const meta = {
  title: 'Components/PinDetailCard',
  component: PinDetailCard,
  args: {
    onClose: fn(),
    pin: {
      pinId: 'xn76-01JDSAMPLE',
      lat: 35.6815,
      lng: 139.7668,
      city: '東京都千代田区',
      stamp: 'kayui',
      memo: '公園のベンチ',
      createdAt: '2026-11-16T10:30:00+09:00',
      commentCount: 2,
      reactions: { odaiji: 3, kaite: 1 },
    },
  },
} satisfies Meta<typeof PinDetailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Itai: Story = { args: { pin: { ...meta.args.pin, stamp: 'itai' } } };
export const Empty: Story = {
  args: { pin: { ...meta.args.pin, stamp: null, memo: '', commentCount: 0, reactions: {} } },
};
export const UnknownCity: Story = { args: { pin: { ...meta.args.pin, city: '不明' } } };
