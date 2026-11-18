import type { Meta, StoryObj } from '@storybook/react-vite';
import { RankList } from './RankList';

const meta = {
  title: 'Components/RankList',
  component: RankList,
  args: {
    items: [
      { rank: 1, label: '世田谷区', count: 42 },
      { rank: 2, label: '渋谷区', count: 31 },
      { rank: 2, label: '杉並区', count: 31 },
      { rank: 4, label: '港区', count: 12 },
    ],
  },
} satisfies Meta<typeof RankList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cities: Story = {};
export const Empty: Story = { args: { items: [] } };
