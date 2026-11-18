import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CodeField } from './CodeField';

const meta = {
  title: 'Components/CodeField',
  component: CodeField,
  args: { value: '', label: '確認コード', onChange: fn() },
} satisfies Meta<typeof CodeField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Partly: Story = { args: { value: '482' } };
