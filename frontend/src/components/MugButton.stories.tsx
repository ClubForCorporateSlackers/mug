import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MugButton } from './MugButton';

const meta = {
  title: 'Components/MugButton',
  component: MugButton,
  args: { children: 'ここで刺された！', onClick: fn() },
} satisfies Meta<typeof MugButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Ghost: Story = { args: { variant: 'ghost', children: 'ログイン' } };
export const Disabled: Story = { args: { disabled: true, children: '送信中' } };
