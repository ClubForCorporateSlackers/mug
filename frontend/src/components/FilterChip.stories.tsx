import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FilterChip } from './FilterChip';

const meta = {
  title: 'Components/FilterChip',
  component: FilterChip,
  args: { children: '2026年11月', onClick: fn() },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};
export const Prefecture: Story = { args: { children: '東京都' } };
