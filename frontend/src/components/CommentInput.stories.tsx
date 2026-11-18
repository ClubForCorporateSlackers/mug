import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CommentInput } from './CommentInput';

const meta = {
  title: 'Components/CommentInput',
  component: CommentInput,
  args: { value: '', placeholder: 'かゆみ太郎 としてコメント…', onChange: fn(), onSubmit: fn() },
} satisfies Meta<typeof CommentInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Typed: Story = { args: { value: 'お大事に！' } };
