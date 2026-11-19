import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PillButton } from './PillButton';

const meta = {
  title: 'Components/PillButton',
  component: PillButton,
  args: { children: '許可する', onClick: fn() },
} satisfies Meta<typeof PillButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongText: Story = { args: { children: 'もう一度ためす' } };
