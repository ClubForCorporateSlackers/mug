import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommentList } from './CommentList';

const meta = {
  title: 'Components/CommentList',
  component: CommentList,
  args: {
    comments: [
      { commentId: '1', nickname: 'みなと', text: '昨日もそこでした。', createdAt: '2026-11-17T11:00:00+09:00' },
      {
        commentId: '2',
        nickname: 'ゆう',
        text: '子どもと通るので別の道にします。',
        createdAt: '2026-11-17T11:20:00+09:00',
      },
    ],
  },
} satisfies Meta<typeof CommentList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Thread: Story = {};
export const Empty: Story = { args: { comments: [] } };
