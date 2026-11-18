import type { Meta, StoryObj } from '@storybook/react-vite';
import { Screen } from './Screen';

const meta = {
  title: 'Components/Screen',
  component: Screen,
  args: { children: <p className="p-4">中身</p> },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Screen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};
export const Brand: Story = { args: { tone: 'brand' } };
export const WithTabBar: Story = { args: { withTabBar: true } };
