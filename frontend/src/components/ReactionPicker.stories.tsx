import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ReactionPicker } from './ReactionPicker';

const meta = {
  title: 'Components/ReactionPicker',
  component: ReactionPicker,
  args: { mine: ['odaiji'], onPick: fn(), onClose: fn() },
} satisfies Meta<typeof ReactionPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NothingYet: Story = { args: { mine: [] } };
