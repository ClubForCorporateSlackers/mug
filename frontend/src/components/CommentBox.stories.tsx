import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CommentBox } from './CommentBox';

const meta = {
  title: 'Components/CommentBox',
  component: CommentBox,
  args: { value: '', placeholder: 'かゆみ太郎 としてコメント…', onChange: fn(), onSubmit: fn() },
} satisfies Meta<typeof CommentBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Typing: Story = { args: { value: 'お大事に！' } };
export const Sending: Story = { args: { value: 'お大事に！', busy: true } };
