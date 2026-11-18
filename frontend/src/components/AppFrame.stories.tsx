import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppFrame } from './AppFrame';

const meta = {
  title: 'Components/AppFrame',
  component: AppFrame,
  args: { children: <p className="p-4">アプリの中身</p> },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
