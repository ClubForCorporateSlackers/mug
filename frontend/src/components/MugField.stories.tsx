import type { Meta, StoryObj } from '@storybook/react-vite';
import { MugField } from './MugField';

const meta = {
  title: 'Components/MugField',
  component: MugField,
  args: { label: 'メールアドレス', name: 'email', placeholder: 'you@example.com' },
} satisfies Meta<typeof MugField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = {
  args: { label: 'パスワード', hint: '8文字以上。大文字・小文字・数字・記号', type: 'password' },
};
