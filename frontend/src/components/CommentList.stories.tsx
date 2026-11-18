import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommentList } from './CommentList';

const meta = {
  title: 'Components/CommentList',
  component: CommentList,
  args: {
    comments: [
      {
        commentId: '1',
        nickname: 'かゆみ太郎',
        text: '自分も昨日ここでやられました…お大事に！',
        createdAt: '',
        when: '1時間前',
      },
      {
        commentId: '2',
        nickname: 'キャンプ好き',
        text: '池のまわりが特に多い気がします。',
        createdAt: '',
        when: '45分前',
      },
    ],
  },
} satisfies Meta<typeof CommentList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Empty: Story = { args: { comments: [] } };
export const Loading: Story = { args: { comments: [], loading: true } };
