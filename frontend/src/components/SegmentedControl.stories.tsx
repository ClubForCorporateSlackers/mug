import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SegmentedControl } from './SegmentedControl';

const meta = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  args: {
    label: 'ランキングの種類',
    options: [
      { value: 'user', label: '人' },
      { value: 'city', label: '市町村' },
      { value: 'blood', label: '血液型' },
    ],
    value: 'city',
    onChange: fn(),
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const City: Story = {};
export const User: Story = { args: { value: 'user' } };
