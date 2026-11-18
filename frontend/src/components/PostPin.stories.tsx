import type { Meta, StoryObj } from '@storybook/react-vite';
import { PostPin } from './PostPin';

const meta = {
  title: 'Components/PostPin',
  component: PostPin,
} satisfies Meta<typeof PostPin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
