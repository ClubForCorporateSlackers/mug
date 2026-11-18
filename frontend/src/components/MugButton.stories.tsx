import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MugButton } from './MugButton';

const meta = {
  title: 'Components/MugButton',
  component: MugButton,
  args: { children: 'ログイン', onClick: fn() },
} satisfies Meta<typeof MugButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Plain: Story = { args: { tone: 'plain', children: 'アカウントを作成' } };
export const Gray: Story = { args: { tone: 'gray', children: '取り消す' } };
export const Disabled: Story = { args: { disabled: true, children: '送信中' } };
