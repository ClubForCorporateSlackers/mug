import type { Meta, StoryObj } from '@storybook/react-vite';
import { AreaCard } from './AreaCard';

const meta = {
  title: 'Components/AreaCard',
  component: AreaCard,
  args: { title: '東京都杉並区', subtitle: '今月 128件の刺されピン', risk: 'high' },
} satisfies Meta<typeof AreaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {};
export const Unknown: Story = { args: { title: '表示中のエリア', subtitle: '今月 3件の刺されピン', risk: null } };
export const Loading: Story = {
  args: { title: '現在地を取得中…', subtitle: 'しばらくお待ちください', risk: undefined },
};
