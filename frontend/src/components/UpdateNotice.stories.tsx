import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { UpdateNotice } from './UpdateNotice';

const meta = {
  title: 'Components/UpdateNotice',
  component: UpdateNotice,
  args: { onUpdate: fn(), onClose: fn() },
} satisfies Meta<typeof UpdateNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
