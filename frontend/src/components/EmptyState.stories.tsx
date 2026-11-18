import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    title: 'まだピンはありません',
    body: '刺されたら、マップの「ここで刺された！」からすぐに投稿できます。',
    actionLabel: 'マップへ戻る',
    onAction: fn(),
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const NoAction: Story = { args: { actionLabel: undefined } };
