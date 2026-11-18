import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ScreenHeader } from './ScreenHeader';

const meta = {
  title: 'Components/ScreenHeader',
  component: ScreenHeader,
  args: { title: 'ここで刺された', onBack: fn() },
} satisfies Meta<typeof ScreenHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithBack: Story = {};
export const TitleOnly: Story = { args: { title: 'ランキング', onBack: undefined } };
