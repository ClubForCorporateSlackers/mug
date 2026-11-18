import type { Meta, StoryObj } from '@storybook/react-vite';
import { MugField } from './MugField';

const meta = {
  title: 'Components/MugField',
  component: MugField,
  args: { label: 'メールアドレス', placeholder: 'example@mail.com' },
} satisfies Meta<typeof MugField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithHint: Story = { args: { label: 'パスワード', type: 'password', hint: '8文字以上' } };
export const Error: Story = {
  args: { label: '新しいパスワード', defaultValue: 'abc', error: '8文字以上で入力してください' },
};
export const Disabled: Story = {
  args: { defaultValue: 'kayumi@example.com', disabled: true, hint: 'メールアドレスは変更できません' },
};
