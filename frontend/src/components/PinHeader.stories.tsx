import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PinHeader } from './PinHeader';

const meta = {
  title: 'Components/PinHeader',
  component: PinHeader,
  args: { title: '匿名さんのピン', subtitle: '東京都杉並区・2時間前', onMenu: fn() },
} satisfies Meta<typeof PinHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Others: Story = {};
export const Mine: Story = { args: { title: 'あなたのピン（匿名で公開中）' } };
