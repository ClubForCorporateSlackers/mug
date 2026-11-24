import type { Meta, StoryObj } from '@storybook/react-vite';
import { RankingTable } from './RankingTable';

const meta = {
  title: 'Components/RankingTable',
  component: RankingTable,
  args: {
    labelHeader: 'ニックネーム',
    items: [
      { rank: 1, label: 'Jiji824', count: 12 },
      { rank: 2, label: 'kokokoko0825', count: 8 },
      { rank: 2, label: 'shibatanaoto0428', count: 8 },
      { rank: 4, label: 'すずき', count: 3 },
    ],
  },
} satisfies Meta<typeof RankingTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
export const Loading: Story = { args: { loading: true } };
export const Error: Story = { args: { error: '通信に失敗しました（502）' } };
