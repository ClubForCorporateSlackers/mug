import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BloodPicker } from './BloodPicker';

const meta = {
  title: 'Components/BloodPicker',
  component: BloodPicker,
  args: { value: 'A', onChange: fn() },
} satisfies Meta<typeof BloodPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = {};
export const Unknown: Story = { args: { value: 'UNKNOWN' } };
export const O: Story = { args: { value: 'O' } };
