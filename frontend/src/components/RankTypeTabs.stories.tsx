import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RankTypeTabs } from './RankTypeTabs';

const meta = {
  title: 'Components/RankTypeTabs',
  component: RankTypeTabs,
  args: {
    value: 'city',
    options: [
      { id: 'user', label: '人' },
      { id: 'city', label: '市町村' },
      { id: 'blood', label: '血液型' },
    ],
    onChange: fn(),
  },
} satisfies Meta<typeof RankTypeTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const City: Story = {};
export const User: Story = { args: { value: 'user' } };
export const WithContent: Story = {
  args: { value: 'blood', children: <p className="text-sm">ここに選んだ種類のランキングが出ます</p> },
};
