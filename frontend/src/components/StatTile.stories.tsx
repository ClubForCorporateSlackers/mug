import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatTile } from './StatTile';

const meta = {
  title: 'Components/StatTile',
  component: StatTile,
  args: { value: '23', label: 'これまで' },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Unknown: Story = { args: { value: '—', label: 'もらった\nお大事に' } };
