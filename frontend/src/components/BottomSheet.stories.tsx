import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BottomSheet } from './BottomSheet';

const meta = {
  title: 'Components/BottomSheet',
  component: BottomSheet,
  args: {
    open: true,
    onClose: fn(),
    title: 'リアクションを送る',
    showTitle: true,
    children: <p className="p-4">中身</p>,
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTitle: Story = {};
export const Plain: Story = { args: { tone: 'plain', showTitle: false } };
