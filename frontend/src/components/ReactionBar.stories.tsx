import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ReactionBar } from './ReactionBar';

const meta = {
  title: 'Components/ReactionBar',
  component: ReactionBar,
  args: { counts: { odaiji: 12, kaite: 2, wakaru: 4 }, mine: ['odaiji'], onToggle: fn() },
} satisfies Meta<typeof ReactionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCounts: Story = {};
export const Empty: Story = { args: { counts: {}, mine: [] } };
