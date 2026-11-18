import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapSurface } from './MapSurface';

const meta = {
  title: 'Components/MapSurface',
  component: MapSurface,
  args: { label: '地図' },
  decorators: [
    (Story) => (
      <div className="relative h-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

// 地図そのものはページで描く。ここでは読み込み前の地の色だけ
export const Empty: Story = {};
