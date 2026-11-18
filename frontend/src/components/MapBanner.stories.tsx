import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert, Move } from 'lucide-react';
import { fn } from 'storybook/test';
import { MapBanner } from './MapBanner';

const meta = {
  title: 'Components/MapBanner',
  component: MapBanner,
  args: { icon: Move, children: '地図を動かして、刺された場所にピンを合わせてください' },
} satisfies Meta<typeof MapBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hint: Story = {};
export const LocationOff: Story = {
  args: {
    icon: CircleAlert,
    tone: 'warning',
    children: '位置情報がオフのため、ピンを立てられません',
    actionLabel: '許可する',
    onAction: fn(),
  },
};
