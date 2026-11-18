import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LocateButton } from './LocateButton';

const meta = {
  title: 'Components/LocateButton',
  component: LocateButton,
  args: { onClick: fn() },
} satisfies Meta<typeof LocateButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
