import type { Meta, StoryObj } from '@storybook/react-vite';
import { BloodChart } from './BloodChart';

const meta = {
  title: 'Components/BloodChart',
  component: BloodChart,
  args: {
    title: '血液型ごとの刺された回数',
    unit: '回',
    items: [
      { rank: 1, label: 'O型', count: 42 },
      { rank: 2, label: 'A型', count: 31 },
      { rank: 3, label: 'B型', count: 29 },
      { rank: 4, label: 'AB型', count: 12 },
    ],
    footer: 'あなた（O型）の今月の回数は準備中です',
  },
} satisfies Meta<typeof BloodChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Empty: Story = { args: { items: [], footer: undefined } };
