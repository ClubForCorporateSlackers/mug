import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppHeader } from './AppHeader';

const meta = {
  title: 'Components/AppHeader',
  component: AppHeader,
  args: { current: 'map', onChange: fn() },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MapSelected: Story = {};
export const RankingSelected: Story = { args: { current: 'ranking' } };
