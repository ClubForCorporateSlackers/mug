import type { Meta, StoryObj } from '@storybook/react-vite';
import { CenterMark } from './CenterMark';

const meta = {
  title: 'Components/CenterMark',
  component: CenterMark,
} satisfies Meta<typeof CenterMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
