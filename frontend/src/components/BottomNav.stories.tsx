import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BottomNav } from './BottomNav';

const meta = {
  title: 'Components/BottomNav',
  component: BottomNav,
  args: { tab: 'map', onChange: fn() },
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Map: Story = {};
export const Ranking: Story = { args: { tab: 'ranking' } };
export const About: Story = { args: { tab: 'about' } };
