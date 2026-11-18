import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PostPanel } from './PostPanel';

const meta = {
  title: 'Components/PostPanel',
  component: PostPanel,
  args: {
    stamp: 'kayui',
    memo: '',
    onStamp: fn(),
    onMemo: fn(),
    onClose: fn(),
    onCancel: fn(),
    onDone: fn(),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PostPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Sending: Story = { args: { busy: true, memo: '公園のベンチ' } };
export const Error: Story = { args: { error: 'スタンプとひとことの保存は準備中です（APIの追加待ち）' } };
