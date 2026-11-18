import type { Meta, StoryObj } from '@storybook/react-vite';
import { RankList } from './RankList';

const meta = {
  title: 'Components/RankList',
  component: RankList,
  args: {
    unit: '回',
    items: [
      { rank: 1, label: '東京都世田谷区', count: 182 },
      { rank: 2, label: '東京都練馬区', count: 151 },
      { rank: 3, label: '東京都杉並区', count: 128 },
      { rank: 4, label: '東京都江戸川区', count: 117 },
      { rank: 4, label: '東京都足立区', count: 117 },
    ],
  },
} satisfies Meta<typeof RankList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Empty: Story = { args: { items: [] } };
export const Loading: Story = { args: { items: [], loading: true } };
