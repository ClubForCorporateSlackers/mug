import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TabBar } from './TabBar';

const meta = {
  title: 'Components/TabBar',
  component: TabBar,
  args: { tab: 'map', onChange: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Map: Story = {};
export const Ranking: Story = { args: { tab: 'ranking' } };
export const About: Story = { args: { tab: 'about' } };
