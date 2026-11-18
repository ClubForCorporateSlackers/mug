import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SectionHeader } from './SectionHeader';

const meta = {
  title: 'Components/SectionHeader',
  component: SectionHeader,
  args: { title: '自分のピン', actionLabel: 'すべて見る', onAction: fn() },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = {};
export const TitleOnly: Story = { args: { actionLabel: undefined } };
