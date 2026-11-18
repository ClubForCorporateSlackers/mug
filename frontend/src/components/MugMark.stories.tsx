import type { Meta, StoryObj } from '@storybook/react-vite';
import { MugMark } from './MugMark';

const meta = {
  title: 'Components/MugMark',
  component: MugMark,
} satisfies Meta<typeof MugMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { className: 'size-24' } };
export const Small: Story = { args: { className: 'size-10' } };
