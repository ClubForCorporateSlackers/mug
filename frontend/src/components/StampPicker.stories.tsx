import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StampPicker } from './StampPicker';

const meta = {
  title: 'Components/StampPicker',
  component: StampPicker,
  args: { value: 'kayui', onChange: fn() },
} satisfies Meta<typeof StampPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = {};
export const None: Story = { args: { value: null } };
