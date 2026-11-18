import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ReactionPicker } from './ReactionPicker';

const meta = {
  title: 'Components/ReactionPicker',
  component: ReactionPicker,
  args: { mine: ['odaiji'], onToggle: fn(), note: '押した人の名前は表示されません。' },
} satisfies Meta<typeof ReactionPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const None: Story = { args: { mine: [] } };
