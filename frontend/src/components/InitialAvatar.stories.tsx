import type { Meta, StoryObj } from '@storybook/react-vite';
import { InitialAvatar } from './InitialAvatar';

const meta = {
  title: 'Components/InitialAvatar',
  component: InitialAvatar,
  args: { name: 'かゆみ太郎' },
} satisfies Meta<typeof InitialAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};
export const Large: Story = { args: { size: 'lg' } };
