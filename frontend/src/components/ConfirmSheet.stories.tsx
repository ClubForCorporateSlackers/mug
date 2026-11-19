import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmSheet } from './ConfirmSheet';

const meta = {
  title: 'Components/ConfirmSheet',
  component: ConfirmSheet,
  args: {
    title: 'ログアウトしますか？',
    body: 'もう一度ログインすると、投稿やコメントができます。',
    confirmLabel: 'ログアウト',
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Logout: Story = {};
export const CancelPost: Story = {
  args: {
    title: '投稿をやめますか？',
    body: '入力したスタンプとひとことは消えます。',
    confirmLabel: 'やめる',
    cancelLabel: '続ける',
  },
};
