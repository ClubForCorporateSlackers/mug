import type { Meta, StoryObj } from '@storybook/react-vite';
import { RankingTabs } from './RankingTabs';

const meta = {
  title: 'Components/RankingTabs',
  component: RankingTabs,
  args: {
    month: '2026-11',
    sections: {
      user: {
        items: [
          { rank: 1, label: 'こまつ', count: 12 },
          { rank: 2, label: 'たなか', count: 8 },
        ],
        loading: false,
        error: null,
      },
      city: {
        items: [
          { rank: 1, label: '東京都千代田区', count: 20 },
          { rank: 2, label: '大阪府大阪市北区', count: 9 },
        ],
        loading: false,
        error: null,
      },
      blood: {
        items: [
          { rank: 1, label: 'O型', count: 15 },
          { rank: 2, label: 'A型', count: 11 },
        ],
        loading: false,
        error: null,
      },
    },
  },
} satisfies Meta<typeof RankingTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = {
  args: {
    month: null,
    sections: {
      user: { items: [], loading: true, error: null },
      city: { items: [], loading: true, error: null },
      blood: { items: [], loading: true, error: null },
    },
  },
};
export const Empty: Story = {
  args: {
    sections: {
      user: { items: [], loading: false, error: null },
      city: { items: [], loading: false, error: null },
      blood: { items: [], loading: false, error: null },
    },
  },
};
