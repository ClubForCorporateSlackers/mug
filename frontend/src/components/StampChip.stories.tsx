import type { Meta, StoryObj } from '@storybook/react-vite';
import { StampChip } from './StampChip';

const meta = { title: 'Components/StampChip', component: StampChip, args: { stamp: 'kayui' } } satisfies Meta<
  typeof StampChip
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Kayui: Story = {};
export const Itai: Story = { args: { stamp: 'itai' } };
