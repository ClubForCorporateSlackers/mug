import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AdjustPanel } from './AdjustPanel';

const meta = {
  title: 'Components/AdjustPanel',
  component: AdjustPanel,
  args: { onCancel: fn(), onConfirm: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AdjustPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
