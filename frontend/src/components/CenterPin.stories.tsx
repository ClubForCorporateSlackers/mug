import type { Meta, StoryObj } from '@storybook/react-vite';
import { CenterPin } from './CenterPin';

const meta = {
  title: 'Components/CenterPin',
  component: CenterPin,
} satisfies Meta<typeof CenterPin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
