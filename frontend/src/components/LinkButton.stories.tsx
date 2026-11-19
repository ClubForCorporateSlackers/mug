import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LinkButton } from './LinkButton';

const meta = {
  title: 'Components/LinkButton',
  component: LinkButton,
  args: { children: 'パスワードをお忘れですか？', small: true, onClick: fn() },
} satisfies Meta<typeof LinkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {};
export const Back: Story = { args: { children: 'マップ', back: true, small: false } };
