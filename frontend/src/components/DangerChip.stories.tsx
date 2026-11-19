import type { Meta, StoryObj } from '@storybook/react-vite';
import { DangerChip } from './DangerChip';

const meta = {
  title: 'Components/DangerChip',
  component: DangerChip,
  args: { level: 'high' },
} satisfies Meta<typeof DangerChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {};
export const Mid: Story = { args: { level: 'mid' } };
export const Low: Story = { args: { level: 'low' } };
