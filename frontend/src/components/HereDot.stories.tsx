import type { Meta, StoryObj } from '@storybook/react-vite';
import { HereDot } from './HereDot';

const meta = {
  title: 'Components/HereDot',
  component: HereDot,
} satisfies Meta<typeof HereDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
