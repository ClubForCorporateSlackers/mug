import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapPin } from 'lucide-react';
import { InfoRow } from './InfoRow';

const meta = {
  title: 'Components/InfoRow',
  component: InfoRow,
  args: { icon: MapPin, children: 'ワンタップで刺された場所にピン' },
  decorators: [
    (Story) => (
      <ul className="bg-brand p-4">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof InfoRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Long: Story = {
  args: { children: '地図をいまいる場所に合わせ、刺された場所にすぐピンを立てるために使います。' },
};
