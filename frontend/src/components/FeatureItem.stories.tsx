import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapPin } from 'lucide-react';
import { FeatureItem } from './FeatureItem';

const meta = {
  title: 'Components/FeatureItem',
  component: FeatureItem,
  args: { icon: MapPin, label: 'ワンタップで刺された場所にピン' },
  decorators: [
    (Story) => (
      <ul>
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof FeatureItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
