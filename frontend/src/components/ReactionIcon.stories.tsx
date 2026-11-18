import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReactionIcon } from './ReactionIcon';

const meta = {
  title: 'Components/ReactionIcon',
  component: ReactionIcon,
  args: { type: 'odaiji', className: 'size-6' },
} satisfies Meta<typeof ReactionIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Odaiji: Story = {};
export const Kaite: Story = { args: { type: 'kaite' } };
export const Wakaru: Story = { args: { type: 'wakaru' } };
