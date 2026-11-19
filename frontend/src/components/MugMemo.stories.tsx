import type { Meta, StoryObj } from '@storybook/react-vite';
import { MugMemo } from './MugMemo';

const meta = {
  title: 'Components/MugMemo',
  component: MugMemo,
  args: { label: 'メモ（任意）', defaultValue: '夕方から多かった。' },
} satisfies Meta<typeof MugMemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { defaultValue: '', placeholder: '番地は書かなくて大丈夫です' } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { 'aria-invalid': true } };
