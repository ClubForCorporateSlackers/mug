import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppNotice } from './AppNotice';

const meta = {
  title: 'Components/AppNotice',
  component: AppNotice,
  args: { children: '位置は半径100mの円の中でずらして保存されます' },
} satisfies Meta<typeof AppNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Error: Story = { args: { tone: 'error', children: 'メモは100文字以内で入力してください' } };
