import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapPin } from 'lucide-react';
import { fn } from 'storybook/test';
import { OptionLinkRow } from './OptionLinkRow';

const meta = {
  title: 'Components/OptionLinkRow',
  component: OptionLinkRow,
  args: { icon: MapPin, label: '都道府県', value: '東京都', onClick: fn() },
} satisfies Meta<typeof OptionLinkRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
