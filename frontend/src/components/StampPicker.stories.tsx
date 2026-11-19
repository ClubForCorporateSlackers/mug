import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StampPicker } from './StampPicker';

const meta = {
  title: 'Components/StampPicker',
  component: StampPicker,
  args: { value: null, onChange: fn() },
} satisfies Meta<typeof StampPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const None: Story = {};
export const Kayui: Story = { args: { value: 'kayui' } };
export const Itai: Story = { args: { value: 'itai' } };
