import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TextAction } from './TextAction';

const meta = {
  title: 'Components/TextAction',
  component: TextAction,
  args: { children: 'キャンセル', onClick: fn() },
} satisfies Meta<typeof TextAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Strong: Story = { args: { strong: true, children: '保存' } };
