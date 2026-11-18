import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    title: 'ログアウトしますか？',
    description: 'もう一度使うときは、メールアドレスとパスワードでログインします。',
    confirmLabel: 'ログアウト',
    onCancel: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Logout: Story = {};
export const DeletePin: Story = {
  args: {
    title: 'このピンを取り消しますか？',
    description: '入力したスタンプとひとことも消えます。',
    confirmLabel: '取り消す',
  },
};
