import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CodeField } from './CodeField';

const meta = {
  title: 'Components/CodeField',
  component: CodeField,
  args: { label: '6桁のコード', value: '', onChange: fn() },
} satisfies Meta<typeof CodeField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Typing: Story = { args: { value: '123' } };
export const Filled: Story = { args: { value: '123456' } };
export const Disabled: Story = { args: { value: '123456', disabled: true } };
export const Error: Story = { args: { value: '123456', invalid: true } };
