import type { Meta, StoryObj } from '@storybook/react-vite';
import { BottomPanel } from './BottomPanel';

const meta = {
  title: 'Components/BottomPanel',
  component: BottomPanel,
  args: { label: 'ピンの位置', children: <p>中身</p> },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BottomPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
